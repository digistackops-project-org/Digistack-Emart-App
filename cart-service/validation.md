curl -X POST http://<cart-Private-IP>:8080/api/v1/cart \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>" \
  -d '{
    "user_id": "user123",
    "items": [
      {
        "product_id": "prod001",
        "name": "Linux for DevOps",
        "price": 999.00,
        "quantity": 1
      },
      {
        "product_id": "prod002",
        "name": "Gitfor Devops",
        "price": 699.00,
        "quantity": 2
      }
    ],
    "total_items": 3,
    "total_price": 1698.00,
    "schema_version": 1
}'
