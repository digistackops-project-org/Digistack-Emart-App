// src/components/checkout/OrdersPage.jsx
// Order history list + single order detail view.
// Route /orders       → list
// Route /orders/:id   → detail
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import paymentApi from '../../services/paymentApi';
import './Checkout.css';

const formatINR  = (n) => new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(n||0);
const formatDate = (d) => d ? new Date(d).toLocaleString('en-IN',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '—';
const catIcon    = (c) => ({books:'📚',courses:'🎓',software:'💻'}[c]||'🛍');

const STATUS_LABELS = {
  PENDING:'Pending',CONFIRMED:'Confirmed',PROCESSING:'Processing',
  SHIPPED:'Shipped',DELIVERED:'Delivered',CANCELLED:'Cancelled',
  PAYMENT_FAILED:'Payment Failed',REFUNDED:'Refunded',
};
const PAY_ICONS = {UPI:'📲',CARD:'💳',NET_BANKING:'🏦',WALLET:'👛',COD:'💵'};

// ── Single order detail ───────────────────────────────────────
function OrderDetail({orderId}) {
  const navigate            = useNavigate();
  const [order,  setOrder]  = useState(null);
  const [loading,setLoading]= useState(true);
  const [error,  setError]  = useState('');

  useEffect(()=>{
    paymentApi.getOrder(orderId)
      .then(r=>setOrder(r.data?.data))
      .catch(e=>setError(e.response?.status===404?'Order not found.':'Failed to load order.'))
      .finally(()=>setLoading(false));
  },[orderId]);

  if(loading) return <div style={{display:'flex',justifyContent:'center',padding:80}}><div className="payment-processing__spinner"/></div>;
  if(error||!order) return <div className="alert-box alert-box--error" style={{marginTop:24}}>⚠ {error||'Order not found.'}</div>;

  const addr = order.shippingAddress;

  return (
    <div>
      <div style={{display:'flex',alignItems:'center',gap:16,marginBottom:24}}>
        <button className="btn btn--secondary" onClick={()=>navigate('/orders')}>← My Orders</button>
        <div>
          <h1 className="checkout-title" style={{margin:0}}>{order.orderNumber}</h1>
          <div style={{fontSize:'0.82rem',color:'#9CA3AF',marginTop:2}}>{formatDate(order.createdAt)}</div>
        </div>
        <span className={`order-status-badge status--${order.status}`} style={{marginLeft:'auto'}}>
          {STATUS_LABELS[order.status]||order.status}
        </span>
      </div>

      {order.status==='PAYMENT_FAILED' && (
        <div className="alert-box alert-box--error" style={{marginBottom:16}}>
          ⚠ Payment failed for this order. &nbsp;
          <button className="btn btn--primary" style={{padding:'5px 14px',fontSize:'0.82rem'}}
            onClick={()=>navigate('/checkout')}>Retry Checkout</button>
        </div>
      )}
      {order.paymentStatus==='SUCCESS' && (
        <div className="alert-box alert-box--success" style={{marginBottom:16}}>
          ✅ Paid · Transaction: <strong>{order.transactionId}</strong>
          {order.paidAt&&<span style={{marginLeft:12,color:'#065F46',opacity:0.8}}>at {formatDate(order.paidAt)}</span>}
        </div>
      )}

      <div style={{display:'grid',gridTemplateColumns:'1fr 320px',gap:20,alignItems:'start'}}>
        <div>
          <div className="step-card" style={{marginBottom:16}}>
            <h3 className="step-card__title">🛒 Items Ordered ({order.totalItems} items)</h3>
            {order.items?.map((item,i)=>(
              <div key={i} className="summary-item" style={{marginBottom:14}}>
                <div className="summary-item__cat">{catIcon(item.category)}</div>
                <div style={{flex:1}}>
                  <div className="summary-item__name">{item.productName}</div>
                  <div className="summary-item__qty">{item.category} · qty {item.quantity}</div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div className="summary-item__price">{formatINR(item.subtotal)}</div>
                  <div style={{fontSize:'0.75rem',color:'#9CA3AF'}}>{formatINR(item.price)} each</div>
                </div>
              </div>
            ))}
          </div>

          {addr && (
            <div className="step-card">
              <h3 className="step-card__title">📦 Delivery Address</h3>
              <div className="review-block__content">
                <strong>{addr.fullName}</strong><br/>
                {addr.addressLine1}{addr.addressLine2?`, ${addr.addressLine2}`:''}<br/>
                {addr.city}, {addr.state} — {addr.pinCode}<br/>
                {addr.country}{addr.phone?` · 📞 ${addr.phone}`:''}
              </div>
            </div>
          )}
        </div>

        <div className="order-summary">
          <h3 className="order-summary__title">Payment Summary</h3>
          <div className="summary-row"><span>Subtotal</span><span>{formatINR(order.subtotal)}</span></div>
          <div className="summary-row"><span>GST (18%)</span><span>{formatINR(order.taxAmount)}</span></div>
          <div className="summary-row">
            <span>Shipping</span>
            <span>{+order.shippingFee===0?<span className="summary-free">FREE</span>:formatINR(order.shippingFee)}</span>
          </div>
          <div className="summary-row summary-row--total">
            <span>Total</span><span className="summary-amount">{formatINR(order.totalAmount)}</span>
          </div>
          <hr className="summary-divider"/>
          <div className="review-block__label">Payment Method</div>
          <div style={{display:'flex',alignItems:'center',gap:8,marginTop:6}}>
            <span style={{fontSize:'1.3rem'}}>{PAY_ICONS[order.paymentMethod]||'💳'}</span>
            <span style={{fontWeight:600,color:'#374151'}}>{order.paymentMethod?.replace('_',' ')}</span>
            <span className={`order-status-badge status--${order.paymentStatus==='SUCCESS'?'CONFIRMED':'PAYMENT_FAILED'}`} style={{marginLeft:'auto'}}>
              {order.paymentStatus}
            </span>
          </div>
          {order.notes&&<><hr className="summary-divider"/><div className="review-block__label">Notes</div><div style={{fontSize:'0.85rem',color:'#6B7280',marginTop:4}}>{order.notes}</div></>}
        </div>
      </div>
    </div>
  );
}

// ── Orders list ───────────────────────────────────────────────
function OrdersList() {
  const navigate             = useNavigate();
  const [orders, setOrders]  = useState([]);
  const [loading,setLoading] = useState(true);
  const [error,  setError]   = useState('');

  useEffect(()=>{
    paymentApi.getOrders()
      .then(r=>setOrders(r.data?.data||[]))
      .catch(()=>setError('Failed to load orders. Please try again.'))
      .finally(()=>setLoading(false));
  },[]);

  if(loading) return <div style={{display:'flex',justifyContent:'center',padding:80}}><div className="payment-processing__spinner"/></div>;

  return (
    <>
      {error&&<div className="alert-box alert-box--error">⚠ {error}</div>}
      {!error&&orders.length===0&&(
        <div className="orders-empty">
          <div className="orders-empty__icon">📦</div>
          <h3>No orders yet</h3>
          <p>Start shopping and your orders will appear here.</p>
          <button className="btn btn--primary" style={{marginTop:16}} onClick={()=>navigate('/')}>Shop Now</button>
        </div>
      )}
      <div className="orders-list">
        {orders.map(order=>(
          <div className="order-card" key={order.id} onClick={()=>navigate(`/orders/${order.id}`)}>
            <div className="order-card__header">
              <div>
                <div className="order-card__number">{order.orderNumber}</div>
                <div className="order-card__date">{formatDate(order.createdAt)}</div>
              </div>
              <span className={`order-status-badge status--${order.status}`}>{STATUS_LABELS[order.status]||order.status}</span>
            </div>
            <div className="order-card__body">
              <div className="order-card__items">
                {order.items?.slice(0,2).map((item,i)=><span key={i} style={{marginRight:8}}>{catIcon(item.category)} {item.productName}</span>)}
                {(order.items?.length||0)>2&&<span style={{color:'#9CA3AF'}}>+{order.items.length-2} more</span>}
              </div>
              <div style={{display:'flex',alignItems:'center',gap:12}}>
                <span style={{fontSize:'0.8rem',color:'#6B7280'}}>{PAY_ICONS[order.paymentMethod]} {order.paymentMethod?.replace('_',' ')}</span>
                <div className="order-card__total">{formatINR(order.totalAmount)}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// ── Root component ────────────────────────────────────────────
export default function OrdersPage() {
  const navigate    = useNavigate();
  const {orderId}   = useParams();

  return (
    <div className="orders-page">
      <div className="orders-page__inner">
        {!orderId&&(
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:28}}>
            <h1 className="checkout-title" style={{margin:0}}>My Orders</h1>
            <button className="btn btn--secondary" onClick={()=>navigate('/')}>← Continue Shopping</button>
          </div>
        )}
        {orderId ? <OrderDetail orderId={orderId}/> : <OrdersList/>}
      </div>
    </div>
  );
}
