import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';

// ============================================================
// Mock Contexts
// ============================================================
const mockUser = { name: 'Alice Johnson', email: 'alice@test.com', roles: ['ROLE_USER'] };
const mockLogout = jest.fn();
const mockNavigate = jest.fn();
const mockOpenCart = jest.fn();
const mockCloseCart = jest.fn();
const mockAddItem = jest.fn();
const mockRemoveItem = jest.fn();
const mockUpdateItem = jest.fn();
const mockClearCart = jest.fn();

jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    token: 'mock-token',
    logout: mockLogout,
    loading: false,
  }),
  AuthProvider: ({ children }) => children,
}));

jest.mock('../context/CartContext', () => ({
  useCart: jest.fn(),
  CartProvider: ({ children }) => children,
}));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: '/dashboard' }),
}));

const { useCart } = require('../context/CartContext');

import AppHeader from '../components/layout/AppHeader';
import CartDrawer from '../components/cart/CartDrawer';

// ============================================================
// Test Helpers
// ============================================================
const defaultCartState = {
  cart: null,
  cartSummary: { total_items: 0, total_amount: 0, currency: 'INR' },
  loading: false,
  cartOpen: false,
  openCart: mockOpenCart,
  closeCart: mockCloseCart,
  addItem: mockAddItem,
  removeItem: mockRemoveItem,
  updateItem: mockUpdateItem,
  clearCart: mockClearCart,
  fetchCart: jest.fn(),
};

const renderWithRouter = (component, cartState = {}) => {
  useCart.mockReturnValue({ ...defaultCartState, ...cartState });
  return render(
    <MemoryRouter>
      {component}
      <ToastContainer />
    </MemoryRouter>
  );
};

// ============================================================
// HEADER TESTS
// ============================================================
describe('AppHeader Component', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders the Emart brand', () => {
    renderWithRouter(<AppHeader />);
    expect(screen.getByText('mart')).toBeInTheDocument();
  });

  it('displays the logged-in user first name', () => {
    renderWithRouter(<AppHeader />);
    expect(screen.getByTestId('user-name')).toHaveTextContent('Alice');
  });

  it('renders Books, Courses, Software navigation buttons', () => {
    renderWithRouter(<AppHeader />);
    expect(screen.getByTestId('nav-books')).toBeInTheDocument();
    expect(screen.getByTestId('nav-courses')).toBeInTheDocument();
    expect(screen.getByTestId('nav-software')).toBeInTheDocument();
    expect(screen.getByText('Books')).toBeInTheDocument();
    expect(screen.getByText('Courses')).toBeInTheDocument();
    expect(screen.getByText('Software')).toBeInTheDocument();
  });

  it('renders cart button', () => {
    renderWithRouter(<AppHeader />);
    expect(screen.getByTestId('cart-button')).toBeInTheDocument();
  });

  it('does NOT show cart badge when cart is empty', () => {
    renderWithRouter(<AppHeader />, {
      cartSummary: { total_items: 0, total_amount: 0, currency: 'INR' },
    });
    expect(screen.queryByTestId('cart-badge')).not.toBeInTheDocument();
  });

  it('shows cart badge with item count when cart has items', () => {
    renderWithRouter(<AppHeader />, {
      cartSummary: { total_items: 3, total_amount: 1500, currency: 'INR' },
    });
    const badge = screen.getByTestId('cart-badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('3');
  });

  it('shows 99+ when cart has more than 99 items', () => {
    renderWithRouter(<AppHeader />, {
      cartSummary: { total_items: 105, total_amount: 50000, currency: 'INR' },
    });
    expect(screen.getByTestId('cart-badge')).toHaveTextContent('99+');
  });

  it('calls openCart when cart button is clicked', () => {
    renderWithRouter(<AppHeader />);
    fireEvent.click(screen.getByTestId('cart-button'));
    expect(mockOpenCart).toHaveBeenCalledTimes(1);
  });

  it('navigates to books when Books button is clicked', () => {
    renderWithRouter(<AppHeader />);
    fireEvent.click(screen.getByTestId('nav-books'));
    expect(mockNavigate).toHaveBeenCalledWith('/books');
  });

  it('navigates to courses when Courses button is clicked', () => {
    renderWithRouter(<AppHeader />);
    fireEvent.click(screen.getByTestId('nav-courses'));
    expect(mockNavigate).toHaveBeenCalledWith('/courses');
  });

  it('navigates to software when Software button is clicked', () => {
    renderWithRouter(<AppHeader />);
    fireEvent.click(screen.getByTestId('nav-software'));
    expect(mockNavigate).toHaveBeenCalledWith('/software');
  });

  it('opens profile dropdown on click', () => {
    renderWithRouter(<AppHeader />);
    fireEvent.click(screen.getByTestId('profile-button'));
    expect(screen.getByTestId('profile-dropdown')).toBeInTheDocument();
    expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    expect(screen.getByText('alice@test.com')).toBeInTheDocument();
  });

  it('calls logout when logout button is clicked', () => {
    renderWithRouter(<AppHeader />);
    fireEvent.click(screen.getByTestId('profile-button'));
    fireEvent.click(screen.getByTestId('logout-btn'));
    expect(mockLogout).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });
});

// ============================================================
// CART DRAWER TESTS
// ============================================================
describe('CartDrawer Component', () => {
  beforeEach(() => jest.clearAllMocks());

  it('is hidden when cartOpen is false', () => {
    renderWithRouter(<CartDrawer />, { cartOpen: false });
    const drawer = screen.getByTestId('cart-drawer');
    expect(drawer).not.toHaveClass('cart-drawer--open');
    expect(screen.queryByTestId('cart-overlay')).not.toBeInTheDocument();
  });

  it('is visible when cartOpen is true', () => {
    renderWithRouter(<CartDrawer />, { cartOpen: true, cart: { items: [] } });
    expect(screen.getByTestId('cart-drawer')).toHaveClass('cart-drawer--open');
    expect(screen.getByTestId('cart-overlay')).toBeInTheDocument();
  });

  it('shows empty state when cart has no items', () => {
    renderWithRouter(<CartDrawer />, {
      cartOpen: true,
      cart: { items: [], total_items: 0, total_amount: 0, currency: 'INR' },
    });
    expect(screen.getByTestId('cart-empty')).toBeInTheDocument();
    expect(screen.getByText('Your cart is empty')).toBeInTheDocument();
  });

  it('renders cart items when cart has products', () => {
    const mockCart = {
      items: [
        { item_id: 'i1', product_id: 'p1', product_name: 'Clean Code', category: 'books', price: 699, quantity: 2 },
        { item_id: 'i2', product_id: 'p2', product_name: 'React Course', category: 'courses', price: 1999, quantity: 1 },
      ],
      total_items: 3,
      total_amount: 3397,
      currency: 'INR',
    };

    renderWithRouter(<CartDrawer />, { cartOpen: true, cart: mockCart });

    expect(screen.getAllByTestId('cart-item')).toHaveLength(2);
    expect(screen.getByText('Clean Code')).toBeInTheDocument();
    expect(screen.getByText('React Course')).toBeInTheDocument();
  });

  it('calls removeItem when remove button is clicked', async () => {
    mockRemoveItem.mockResolvedValue({ success: true, data: { items: [], total_items: 0, total_amount: 0 } });

    const mockCart = {
      items: [
        { item_id: 'i1', product_id: 'p1', product_name: 'Clean Code', category: 'books', price: 699, quantity: 1 },
      ],
      total_items: 1,
      total_amount: 699,
      currency: 'INR',
    };

    renderWithRouter(<CartDrawer />, { cartOpen: true, cart: mockCart, removeItem: mockRemoveItem });
    fireEvent.click(screen.getByTestId('remove-item'));

    await waitFor(() => {
      expect(mockRemoveItem).toHaveBeenCalledWith('i1');
    });
  });

  it('closes drawer when overlay is clicked', () => {
    renderWithRouter(<CartDrawer />, { cartOpen: true, cart: { items: [] } });
    fireEvent.click(screen.getByTestId('cart-overlay'));
    expect(mockCloseCart).toHaveBeenCalled();
  });

  it('closes drawer when X button is clicked', () => {
    renderWithRouter(<CartDrawer />, { cartOpen: true, cart: { items: [] } });
    fireEvent.click(screen.getByTestId('cart-close'));
    expect(mockCloseCart).toHaveBeenCalled();
  });

  it('displays loading state', () => {
    renderWithRouter(<CartDrawer />, { cartOpen: true, loading: true, cart: null });
    expect(screen.getByText('Loading cart...')).toBeInTheDocument();
  });
});
