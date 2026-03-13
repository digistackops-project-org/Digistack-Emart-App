// src/components/checkout/CheckoutPage.jsx
// ============================================================
// 4-step checkout:  Cart Review → Shipping → Payment → Confirm
// Reads live cart from CartContext, creates order via payment-api,
// processes payment, clears cart on success.
// ============================================================
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useCart } from '../../context/CartContext';
import paymentApi from '../../services/paymentApi';
import './Checkout.css';

// ── Constants ─────────────────────────────────────────────────
const STEPS = ['Review Cart', 'Shipping', 'Payment', 'Confirm'];

const PAYMENT_METHODS = [
  { value: 'UPI',         label: 'UPI',         icon: '📲', desc: 'Google Pay, PhonePe, BHIM' },
  { value: 'CARD',        label: 'Card',         icon: '💳', desc: 'Credit / Debit card' },
  { value: 'NET_BANKING', label: 'Net Banking',  icon: '🏦', desc: 'HDFC, SBI, ICICI, Axis' },
  { value: 'WALLET',      label: 'Wallet',       icon: '👛', desc: 'Paytm, Amazon Pay' },
  { value: 'COD',         label: 'Cash on Delivery', icon: '💵', desc: 'Pay when delivered' },
];

const BANKS = ['HDFC Bank','State Bank of India','ICICI Bank','Axis Bank','Kotak Bank','Yes Bank'];
const WALLETS = ['Paytm','PhonePe','Amazon Pay','Mobikwik','Freecharge'];
const STATES = ['Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Delhi','Chandigarh','Puducherry'];

const formatINR = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);
const catIcon   = (c) => ({ books: '📚', courses: '🎓', software: '💻' }[c] || '🛍');

export default function CheckoutPage() {
  const navigate     = useNavigate();
  const { cart, cartSummary, clearCart } = useCart();

  const [step,    setStep]    = useState(0);   // 0–3
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  // Shipping form state
  const [shipping, setShipping] = useState({
    fullName: '', addressLine1: '', addressLine2: '',
    city: '', state: '', pinCode: '', country: 'India', phone: '',
  });
  const [shipErrors, setShipErrors] = useState({});

  // Payment form state
  const [payMethod,     setPayMethod]     = useState('UPI');
  const [upiId,         setUpiId]         = useState('');
  const [cardNumber,    setCardNumber]    = useState('');
  const [cardHolder,    setCardHolder]    = useState('');
  const [cardExpiry,    setCardExpiry]    = useState('');
  const [cardCvv,       setCardCvv]       = useState('');
  const [bankName,      setBankName]      = useState('HDFC Bank');
  const [walletType,    setWalletType]    = useState('Paytm');

  // Result state
  const [createdOrder, setCreatedOrder] = useState(null);   // order from POST /checkout
  const [payResult,    setPayResult]    = useState(null);   // result from /process

  // Guard: if cart is empty, redirect
  useEffect(() => {
    if (cartSummary.total_items === 0 && step === 0) {
      toast.info('Your cart is empty');
      navigate('/');
    }
  }, []);

  // ── Calculated amounts ────────────────────────────────────
  const subtotal     = cartSummary.total_price || 0;
  const tax          = Math.round(subtotal * 0.18 * 100) / 100;
  const shipping_fee = subtotal >= 999 ? 0 : 49;
  const total        = subtotal + tax + shipping_fee;

  // ── Shipping validation ────────────────────────────────────
  const validateShipping = () => {
    const errs = {};
    if (!shipping.fullName.trim())    errs.fullName    = 'Full name is required';
    if (!shipping.addressLine1.trim()) errs.addressLine1 = 'Address is required';
    if (!shipping.city.trim())        errs.city        = 'City is required';
    if (!shipping.state)              errs.state       = 'State is required';
    if (!/^[1-9][0-9]{5}$/.test(shipping.pinCode)) errs.pinCode = 'Valid 6-digit PIN required';
    if (shipping.phone && !/^[6-9]\d{9}$/.test(shipping.phone)) errs.phone = 'Valid 10-digit mobile required';
    setShipErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Step 0 → 1: Cart review ────────────────────────────────
  const handleCartNext = () => setStep(1);

  // ── Step 1 → 2: Shipping ──────────────────────────────────
  const handleShippingNext = () => {
    if (validateShipping()) { setError(''); setStep(2); }
  };

  // ── Step 2 → 3: Create order + process payment ────────────
  const handlePayment = async () => {
    setError('');
    setLoading(true);

    const paymentDetails = buildPaymentDetails();

    try {
      // 1) Create order from cart
      const checkoutRes = await paymentApi.checkout({
        shippingAddress: shipping,
        paymentMethod:   payMethod,
        paymentDetails,
      });

      const order = checkoutRes.data?.data;
      if (!order) throw new Error('Checkout failed — no order returned');
      setCreatedOrder(order);

      // 2) Process payment
      const payRes = await paymentApi.processPayment(order.id, paymentDetails);
      const result = payRes.data?.data;
      setPayResult(result);

      if (result?.paymentStatus === 'SUCCESS') {
        // Clear cart in UI (Cart Service cleared server-side by Payment Service)
        clearCart();
        toast.success(`🎉 Order ${result.orderNumber} confirmed!`);
      } else {
        setError(result?.message || 'Payment failed. Please try another method.');
      }
      setStep(3);

    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Something went wrong';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const buildPaymentDetails = () => {
    switch (payMethod) {
      case 'UPI':         return { upiId };
      case 'CARD':        return { cardNumber: cardNumber.replace(/\s/g, ''), cardHolder, cardExpiry };
      case 'NET_BANKING': return { bankName };
      case 'WALLET':      return { walletType };
      case 'COD':         return {};
      default:            return {};
    }
  };

  const formatCard = (v) => v.replace(/\D/g,'').slice(0,16).replace(/(.{4})/g,'$1 ').trim();

  // ── Render helpers ────────────────────────────────────────
  const stepStatus = (i) => i < step ? 'done' : i === step ? 'active' : '';

  // ─────────────────────────────────────────────────────────
  return (
    <div className="checkout-page">
      <div className="checkout-page__inner">
        <h1 className="checkout-title">Checkout</h1>

        {/* Stepper */}
        <div className="stepper">
          {STEPS.map((label, i) => (
            <div key={i} className={`step-item step-item--${stepStatus(i)}`}>
              <div className="step-circle">
                {i < step ? null : i + 1}
              </div>
              <span className="step-label">{label}</span>
            </div>
          ))}
        </div>

        <div className="checkout-layout">
          {/* ── Main steps ───────────────────────────────── */}
          <div>

            {/* STEP 0: Cart review */}
            {step === 0 && (
              <div className="step-card">
                <h2 className="step-card__title">🛒 Your Cart</h2>
                {cart?.items?.map(item => (
                  <div className="summary-item" key={item.item_id} style={{ marginBottom: 12 }}>
                    <div className="summary-item__cat">{catIcon(item.category)}</div>
                    <div style={{ flex: 1 }}>
                      <div className="summary-item__name">{item.product_name}</div>
                      <div className="summary-item__qty">{item.category} · qty {item.quantity}</div>
                    </div>
                    <div className="summary-item__price">{formatINR(item.price * item.quantity)}</div>
                  </div>
                ))}
                <div className="step-nav">
                  <button className="btn btn--secondary" onClick={() => navigate(-1)}>← Back</button>
                  <button className="btn btn--primary" onClick={handleCartNext}>
                    Shipping Address →
                  </button>
                </div>
              </div>
            )}

            {/* STEP 1: Shipping */}
            {step === 1 && (
              <div className="step-card">
                <h2 className="step-card__title">📦 Shipping Address</h2>
                <div className="form-grid">
                  <div className="form-group form-full">
                    <label className="form-label">Full Name <span className="req">*</span></label>
                    <input className={`form-input ${shipErrors.fullName ? 'form-input--error' : ''}`}
                      value={shipping.fullName}
                      onChange={e => setShipping(s => ({ ...s, fullName: e.target.value }))}
                      placeholder="As on ID proof" />
                    {shipErrors.fullName && <span className="form-error">{shipErrors.fullName}</span>}
                  </div>

                  <div className="form-group form-full">
                    <label className="form-label">Address Line 1 <span className="req">*</span></label>
                    <input className={`form-input ${shipErrors.addressLine1 ? 'form-input--error' : ''}`}
                      value={shipping.addressLine1}
                      onChange={e => setShipping(s => ({ ...s, addressLine1: e.target.value }))}
                      placeholder="House / Flat / Street" />
                    {shipErrors.addressLine1 && <span className="form-error">{shipErrors.addressLine1}</span>}
                  </div>

                  <div className="form-group form-full">
                    <label className="form-label">Address Line 2</label>
                    <input className="form-input"
                      value={shipping.addressLine2}
                      onChange={e => setShipping(s => ({ ...s, addressLine2: e.target.value }))}
                      placeholder="Landmark, Area (optional)" />
                  </div>

                  <div className="form-group">
                    <label className="form-label">City <span className="req">*</span></label>
                    <input className={`form-input ${shipErrors.city ? 'form-input--error' : ''}`}
                      value={shipping.city}
                      onChange={e => setShipping(s => ({ ...s, city: e.target.value }))}
                      placeholder="e.g. Bengaluru" />
                    {shipErrors.city && <span className="form-error">{shipErrors.city}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label">State <span className="req">*</span></label>
                    <select className={`form-select ${shipErrors.state ? 'form-input--error' : ''}`}
                      value={shipping.state}
                      onChange={e => setShipping(s => ({ ...s, state: e.target.value }))}>
                      <option value="">— Select State —</option>
                      {STATES.map(st => <option key={st} value={st}>{st}</option>)}
                    </select>
                    {shipErrors.state && <span className="form-error">{shipErrors.state}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label">PIN Code <span className="req">*</span></label>
                    <input className={`form-input ${shipErrors.pinCode ? 'form-input--error' : ''}`}
                      value={shipping.pinCode}
                      onChange={e => setShipping(s => ({ ...s, pinCode: e.target.value.replace(/\D/,'').slice(0,6) }))}
                      placeholder="6-digit PIN" maxLength={6} />
                    {shipErrors.pinCode && <span className="form-error">{shipErrors.pinCode}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Mobile Number</label>
                    <input className={`form-input ${shipErrors.phone ? 'form-input--error' : ''}`}
                      value={shipping.phone}
                      onChange={e => setShipping(s => ({ ...s, phone: e.target.value.replace(/\D/,'').slice(0,10) }))}
                      placeholder="10-digit mobile" maxLength={10} />
                    {shipErrors.phone && <span className="form-error">{shipErrors.phone}</span>}
                  </div>
                </div>

                <div className="step-nav">
                  <button className="btn btn--secondary" onClick={() => setStep(0)}>← Back</button>
                  <button className="btn btn--primary" onClick={handleShippingNext}>
                    Payment →
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: Payment */}
            {step === 2 && (
              <div className="step-card">
                <h2 className="step-card__title">💳 Payment Method</h2>

                {error && (
                  <div className="alert-box alert-box--error">⚠ {error}</div>
                )}

                {loading ? (
                  <div className="payment-processing">
                    <div className="payment-processing__spinner" />
                    <p>Processing your payment…</p>
                    <p style={{ fontSize: '0.8rem', color: '#9CA3AF' }}>Please do not refresh or close this page</p>
                  </div>
                ) : (
                  <>
                    <div className="payment-methods">
                      {PAYMENT_METHODS.map(pm => (
                        <button key={pm.value}
                          className={`payment-tile ${payMethod === pm.value ? 'payment-tile--selected' : ''}`}
                          onClick={() => setPayMethod(pm.value)}>
                          <span className="payment-tile__icon">{pm.icon}</span>
                          <span className="payment-tile__label">{pm.label}</span>
                        </button>
                      ))}
                    </div>

                    {/* Method-specific inputs */}
                    {payMethod === 'UPI' && (
                      <div className="payment-details-box">
                        <div className="form-group">
                          <label className="form-label">UPI ID <span className="req">*</span></label>
                          <input className="form-input"
                            value={upiId}
                            onChange={e => setUpiId(e.target.value)}
                            placeholder="yourname@bankcode  (e.g. user@okicici)" />
                          <span style={{ fontSize: '0.75rem', color: '#9CA3AF', marginTop: 4 }}>
                            Use <code>fail@upi</code> to simulate a failure
                          </span>
                        </div>
                      </div>
                    )}

                    {payMethod === 'CARD' && (
                      <div className="payment-details-box">
                        <div className="form-grid">
                          <div className="form-group form-full">
                            <label className="form-label">Card Number <span className="req">*</span></label>
                            <input className="form-input"
                              value={cardNumber}
                              onChange={e => setCardNumber(formatCard(e.target.value))}
                              placeholder="4111 1111 1111 1111" maxLength={19} />
                            <span style={{ fontSize: '0.72rem', color: '#9CA3AF', marginTop: 3 }}>
                              Test: <code>4111 1111 1111 1111</code> (success) · <code>4000 0000 0000 0002</code> (decline)
                            </span>
                          </div>
                          <div className="form-group form-full">
                            <label className="form-label">Cardholder Name</label>
                            <input className="form-input"
                              value={cardHolder}
                              onChange={e => setCardHolder(e.target.value)}
                              placeholder="Name as on card" />
                          </div>
                          <div className="form-group">
                            <label className="form-label">Expiry</label>
                            <input className="form-input"
                              value={cardExpiry}
                              onChange={e => setCardExpiry(e.target.value)}
                              placeholder="MM/YY" maxLength={5} />
                          </div>
                          <div className="form-group">
                            <label className="form-label">CVV</label>
                            <input className="form-input"
                              value={cardCvv}
                              onChange={e => setCardCvv(e.target.value.slice(0,4))}
                              placeholder="•••" maxLength={4} type="password" />
                          </div>
                        </div>
                      </div>
                    )}

                    {payMethod === 'NET_BANKING' && (
                      <div className="payment-details-box">
                        <div className="form-group">
                          <label className="form-label">Select Bank</label>
                          <select className="form-select" value={bankName} onChange={e => setBankName(e.target.value)}>
                            {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                          </select>
                        </div>
                      </div>
                    )}

                    {payMethod === 'WALLET' && (
                      <div className="payment-details-box">
                        <div className="form-group">
                          <label className="form-label">Select Wallet</label>
                          <select className="form-select" value={walletType} onChange={e => setWalletType(e.target.value)}>
                            {WALLETS.map(w => <option key={w} value={w}>{w}</option>)}
                          </select>
                        </div>
                      </div>
                    )}

                    {payMethod === 'COD' && (
                      <div className="cod-info">
                        <span className="cod-info__icon">💵</span>
                        <p>Pay with cash when your order is delivered. No additional charges. Available for orders up to ₹10,000.</p>
                      </div>
                    )}

                    <div className="step-nav">
                      <button className="btn btn--secondary" onClick={() => setStep(1)}>← Back</button>
                      <button className="btn btn--success" onClick={handlePayment}
                        disabled={payMethod === 'UPI' && !upiId.trim()}>
                        Pay {formatINR(total)} →
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* STEP 3: Confirmation */}
            {step === 3 && (
              <div className="step-card">
                {payResult?.paymentStatus === 'SUCCESS' ? (
                  <div className="confirmation-screen">
                    <div className="confirmation-icon confirmation-icon--success">🎉</div>
                    <h2>Payment Successful!</h2>
                    <p>Your order has been confirmed.</p>
                    <div className="confirmation-order-no">{payResult.orderNumber}</div>
                    <p style={{ fontSize: '0.82rem' }}>
                      Transaction ID: <strong>{payResult.transactionId}</strong>
                    </p>
                    <div className="confirmation-actions">
                      <button className="btn btn--primary" onClick={() => navigate('/orders')}>
                        View My Orders
                      </button>
                      <button className="btn btn--secondary" onClick={() => navigate('/')}>
                        Continue Shopping
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="confirmation-screen">
                    <div className="confirmation-icon confirmation-icon--failed">❌</div>
                    <h2>Payment Failed</h2>
                    <p>{payResult?.message || error || 'Your payment could not be processed.'}</p>
                    {createdOrder && (
                      <div className="confirmation-order-no">{createdOrder.orderNumber}</div>
                    )}
                    <p style={{ fontSize: '0.82rem', color: '#9CA3AF' }}>
                      Your order has been saved. You can retry payment from Order History.
                    </p>
                    <div className="confirmation-actions">
                      <button className="btn btn--primary" onClick={() => setStep(2)}>
                        Try Again
                      </button>
                      <button className="btn btn--secondary" onClick={() => navigate('/orders')}>
                        My Orders
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Sidebar: Order summary ────────────────────────── */}
          {step < 3 && (
            <div className="order-summary checkout-sidebar">
              <h3 className="order-summary__title">Order Summary</h3>
              <div className="summary-items">
                {cart?.items?.map(item => (
                  <div className="summary-item" key={item.item_id}>
                    <div className="summary-item__cat">{catIcon(item.category)}</div>
                    <div style={{ flex: 1 }}>
                      <div className="summary-item__name">{item.product_name}</div>
                      <div className="summary-item__qty">×{item.quantity}</div>
                    </div>
                    <div className="summary-item__price">{formatINR(item.price * item.quantity)}</div>
                  </div>
                ))}
              </div>
              <hr className="summary-divider" />
              <div className="summary-row">
                <span>Subtotal</span>
                <span>{formatINR(subtotal)}</span>
              </div>
              <div className="summary-row">
                <span>GST (18%)</span>
                <span>{formatINR(tax)}</span>
              </div>
              <div className="summary-row">
                <span>Shipping</span>
                <span>
                  {shipping_fee === 0
                    ? <span className="summary-free">FREE <span className="summary-badge">≥₹999</span></span>
                    : formatINR(shipping_fee)
                  }
                </span>
              </div>
              <div className="summary-row summary-row--total">
                <span>Total</span>
                <span className="summary-amount">{formatINR(total)}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
