import React from 'react';
import Header from '../layout/Header';
import './Dashboard.css';

const SERVICE_CARDS = [
  {
    id: 'books',
    icon: '📚',
    title: 'Books',
    description: 'Browse thousands of technical and non-technical books',
    badge: 'Coming Soon',
    btnClass: 'books',
  },
  {
    id: 'courses',
    icon: '🎓',
    title: 'Courses',
    description: 'Video courses from expert instructors on any topic',
    badge: 'Coming Soon',
    btnClass: 'courses',
  },
  {
    id: 'software',
    icon: '💻',
    title: 'Software',
    description: 'Licenses and tools for developers and professionals',
    badge: 'Coming Soon',
    btnClass: 'software',
  },
];

function Dashboard() {
  const user = JSON.parse(localStorage.getItem('emart_user') || '{}');

  return (
    <div className="dashboard-page">
      {/* Header: username + cart icon + 3 nav buttons */}
      <Header />

      <main className="page-content">
        {/* Welcome Banner */}
        <section className="welcome-banner" data-testid="welcome-banner">
          <h1 data-testid="welcome-heading">
            Welcome back, <span className="highlight">{user.name || 'User'}!</span>
          </h1>
          <p>Explore our marketplace — Books, Courses, and Software all in one place.</p>
        </section>

        {/* Service Cards */}
        <section className="services-section">
          <h2 className="section-title">Our Services</h2>
          <div className="service-cards" data-testid="service-cards">
            {SERVICE_CARDS.map((card) => (
              <div
                key={card.id}
                className="service-card"
                data-testid={`service-card-${card.id}`}
              >
                <div className="card-icon">{card.icon}</div>
                <div className="card-body">
                  <div className="card-title-row">
                    <h3>{card.title}</h3>
                    <span className="card-badge">{card.badge}</span>
                  </div>
                  <p className="card-desc">{card.description}</p>
                  <button
                    className={`card-btn ${card.btnClass}`}
                    data-testid={`${card.id}-card-btn`}
                  >
                    Browse {card.title}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

export default Dashboard;
