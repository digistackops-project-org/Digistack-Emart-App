package migration

import (
	"context"
	"fmt"
	"time"

	"github.com/emart/cart-service/internal/model"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"go.uber.org/zap"
)

type Migration interface {
	ID() string
	Order() string
	Author() string
	Execute(ctx context.Context, db *mongo.Database) error
	Rollback(ctx context.Context, db *mongo.Database) error
}

type Runner struct {
	db         *mongo.Database
	logger     *zap.Logger
	migrations []Migration
}

const (
	changeLogCollection = "mongockChangeLog"
	lockCollection      = "mongockLock"
	stateExecuted       = "EXECUTED"
	stateFailed         = "FAILED"
)

func NewRunner(db *mongo.Database, logger *zap.Logger) *Runner {
	r := &Runner{db: db, logger: logger}
	r.migrations = []Migration{
		NewV001CreateCartsCollection(),
		NewV002AddCartIndexes(),
		NewV003AddSchemaValidation(),
	}
	return r
}

func (r *Runner) Run(ctx context.Context) error {
	r.logger.Info("Mongock-Go migration runner starting")
	if err := r.acquireLock(ctx); err != nil {
		return fmt.Errorf("cannot acquire migration lock: %w", err)
	}
	defer r.releaseLock(ctx)

	for _, m := range r.migrations {
		executed, err := r.isExecuted(ctx, m.ID())
		if err != nil {
			return fmt.Errorf("check migration state %s: %w", m.ID(), err)
		}
		if executed {
			r.logger.Info("Skipping already executed migration", zap.String("id", m.ID()))
			continue
		}
		r.logger.Info("Executing migration", zap.String("id", m.ID()))
		if err := m.Execute(ctx, r.db); err != nil {
			r.recordState(ctx, m, stateFailed, err.Error())
			return fmt.Errorf("migration %s failed: %w", m.ID(), err)
		}
		r.recordState(ctx, m, stateExecuted, "")
		r.logger.Info("Migration executed", zap.String("id", m.ID()))
	}
	r.logger.Info("All migrations completed")
	return nil
}

func (r *Runner) isExecuted(ctx context.Context, id string) (bool, error) {
	res := r.db.Collection(changeLogCollection).FindOne(ctx, bson.M{"changeId": id, "state": stateExecuted})
	if res.Err() == mongo.ErrNoDocuments {
		return false, nil
	}
	return res.Err() == nil, res.Err()
}

func (r *Runner) recordState(ctx context.Context, m Migration, state, errMsg string) {
	doc := bson.M{"changeId": m.ID(), "author": m.Author(), "state": state, "executedAt": time.Now(), "order": m.Order(), "error": errMsg}
	opts := options.Update().SetUpsert(true)
	r.db.Collection(changeLogCollection).UpdateOne(ctx, bson.M{"changeId": m.ID()}, bson.M{"$set": doc}, opts)
}

func (r *Runner) acquireLock(ctx context.Context) error {
	coll := r.db.Collection(lockCollection)
	lockDoc := bson.M{"_id": "migration-lock", "locked": true, "lockedAt": time.Now(), "expiresAt": time.Now().Add(5 * time.Minute)}
	opts := options.Update().SetUpsert(true)
	filter := bson.M{"_id": "migration-lock", "$or": bson.A{bson.M{"locked": false}, bson.M{"expiresAt": bson.M{"$lt": time.Now()}}}}
	result, err := coll.UpdateOne(ctx, filter, bson.M{"$set": lockDoc}, opts)
	if err != nil {
		return err
	}
	if result.MatchedCount == 0 && result.UpsertedCount == 0 {
		return fmt.Errorf("migration lock held by another process")
	}
	return nil
}

func (r *Runner) releaseLock(ctx context.Context) {
	r.db.Collection(lockCollection).UpdateOne(ctx, bson.M{"_id": "migration-lock"}, bson.M{"$set": bson.M{"locked": false}})
}

func (r *Runner) PrintStatus(ctx context.Context) {
	cursor, _ := r.db.Collection(changeLogCollection).Find(ctx, bson.M{})
	defer cursor.Close(ctx)
	var records []model.MigrationRecord
	cursor.All(ctx, &records)
	for _, rec := range records {
		r.logger.Info(fmt.Sprintf("[%s] %s | %s", rec.State, rec.ChangeID, rec.ExecutedAt.Format(time.RFC3339)))
	}
}
