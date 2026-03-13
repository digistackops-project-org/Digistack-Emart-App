// src/components/profile/ProfilePage.jsx
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import profileApi from '../../services/profileApi';
import './Profile.css';

const STATES = ['Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Delhi','Goa',
  'Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh',
  'Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan',
  'Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal'];

export default function ProfilePage() {
  const [profile,   setProfile]   = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [showAddrForm, setShowAddrForm] = useState(false);
  const [editingAddr,  setEditingAddr]  = useState(null);

  const [form, setForm] = useState({
    name:'', phone:'', date_of_birth:'', gender:'',
    bio:'', website:'', company:'', job_title:'',
    newsletter:false, notifications:true
  });

  const [addrForm, setAddrForm] = useState({
    label:'home', full_name:'', line1:'', line2:'',
    city:'', state:'', pin_code:'', phone:'', is_default:false
  });

  useEffect(() => {
    Promise.all([
      profileApi.getProfile(),
      profileApi.getAddresses(),
    ]).then(([pRes, aRes]) => {
      const p = pRes.data?.data;
      setProfile(p);
      setForm({
        name: p?.name||'', phone: p?.phone||'', date_of_birth: p?.date_of_birth?.slice(0,10)||'',
        gender: p?.gender||'', bio: p?.bio||'', website: p?.website||'',
        company: p?.company||'', job_title: p?.job_title||'',
        newsletter: p?.newsletter||false, notifications: p?.notifications!==false,
      });
      setAddresses(aRes.data?.data || []);
    }).catch(() => toast.error('Failed to load profile'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {};
      Object.entries(form).forEach(([k,v]) => { if (v !== '' && v !== null) payload[k] = v; });
      const res = await profileApi.updateProfile(payload);
      setProfile(res.data?.data);
      toast.success('Profile updated!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally { setSaving(false); }
  };

  const handleAddrSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingAddr) {
        await profileApi.updateAddress(editingAddr.id, addrForm);
        toast.success('Address updated!');
      } else {
        await profileApi.addAddress(addrForm);
        toast.success('Address added!');
      }
      const res = await profileApi.getAddresses();
      setAddresses(res.data?.data || []);
      setShowAddrForm(false); setEditingAddr(null);
      setAddrForm({ label:'home', full_name:'', line1:'', line2:'', city:'', state:'', pin_code:'', phone:'', is_default:false });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save address');
    }
  };

  const handleDeleteAddr = async (id) => {
    if (!window.confirm('Delete this address?')) return;
    try {
      await profileApi.deleteAddress(id);
      setAddresses(a => a.filter(x => x.id !== id));
      toast.success('Address deleted');
    } catch { toast.error('Failed to delete address'); }
  };

  const startEditAddr = (addr) => {
    setEditingAddr(addr);
    setAddrForm({ label:addr.label||'home', full_name:addr.full_name||'', line1:addr.line1, line2:addr.line2||'',
      city:addr.city, state:addr.state, pin_code:addr.pin_code, phone:addr.phone||'', is_default:addr.is_default||false });
    setShowAddrForm(true);
  };

  if (loading) return <div className="profile-loading"><div className="profile-spinner"/></div>;

  const initial = (profile?.name||'U').charAt(0).toUpperCase();

  return (
    <div className="profile-page">
      <div className="profile-page__inner">
        {/* Header */}
        <div className="profile-hero">
          <div className="profile-avatar-large">{initial}</div>
          <div>
            <h1 className="profile-name">{profile?.name}</h1>
            <p className="profile-email-display">{profile?.email}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="profile-tabs">
          {['profile','addresses'].map(tab => (
            <button key={tab} className={`profile-tab ${activeTab===tab?'profile-tab--active':''}`}
              onClick={() => setActiveTab(tab)}>
              {tab === 'profile' ? '👤 Profile' : '📦 Addresses'}
            </button>
          ))}
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <form className="profile-form" onSubmit={handleSave}>
            <div className="profile-section">
              <h3 className="profile-section__title">Personal Information</h3>
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input className="form-input" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Your full name"/>
                </div>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input className="form-input" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="10-digit mobile number"/>
                </div>
                <div className="form-group">
                  <label className="form-label">Date of Birth</label>
                  <input className="form-input" type="date" value={form.date_of_birth} onChange={e=>setForm({...form,date_of_birth:e.target.value})}/>
                </div>
                <div className="form-group">
                  <label className="form-label">Gender</label>
                  <select className="form-select" value={form.gender} onChange={e=>setForm({...form,gender:e.target.value})}>
                    <option value="">Prefer not to say</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="non-binary">Non-binary</option>
                  </select>
                </div>
              </div>
              <div className="form-group" style={{marginTop:12}}>
                <label className="form-label">Bio</label>
                <textarea className="form-textarea" rows={3} value={form.bio}
                  onChange={e=>setForm({...form,bio:e.target.value})} placeholder="Tell us a bit about yourself..."/>
              </div>
            </div>

            <div className="profile-section">
              <h3 className="profile-section__title">Professional</h3>
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Company</label>
                  <input className="form-input" value={form.company} onChange={e=>setForm({...form,company:e.target.value})} placeholder="Company name"/>
                </div>
                <div className="form-group">
                  <label className="form-label">Job Title</label>
                  <input className="form-input" value={form.job_title} onChange={e=>setForm({...form,job_title:e.target.value})} placeholder="Your role"/>
                </div>
                <div className="form-group">
                  <label className="form-label">Website</label>
                  <input className="form-input" value={form.website} onChange={e=>setForm({...form,website:e.target.value})} placeholder="https://yoursite.com"/>
                </div>
              </div>
            </div>

            <div className="profile-section">
              <h3 className="profile-section__title">Preferences</h3>
              <div className="pref-row">
                <div>
                  <div className="pref-label">Newsletter</div>
                  <div className="pref-desc">Receive weekly deals and product updates</div>
                </div>
                <label className="toggle">
                  <input type="checkbox" checked={form.newsletter} onChange={e=>setForm({...form,newsletter:e.target.checked})}/>
                  <span className="toggle-slider"/>
                </label>
              </div>
              <div className="pref-row">
                <div>
                  <div className="pref-label">Order Notifications</div>
                  <div className="pref-desc">Email me when my order status changes</div>
                </div>
                <label className="toggle">
                  <input type="checkbox" checked={form.notifications} onChange={e=>setForm({...form,notifications:e.target.checked})}/>
                  <span className="toggle-slider"/>
                </label>
              </div>
            </div>

            <div style={{display:'flex',justifyContent:'flex-end',marginTop:24}}>
              <button type="submit" className="btn-save-profile" disabled={saving}>
                {saving ? 'Saving…' : '💾 Save Profile'}
              </button>
            </div>
          </form>
        )}

        {/* Addresses Tab */}
        {activeTab === 'addresses' && (
          <div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
              <h3 style={{margin:0,fontWeight:700,color:'#111827'}}>Saved Addresses ({addresses.length})</h3>
              <button className="btn-add-address" onClick={()=>{setShowAddrForm(true);setEditingAddr(null);}}>
                + Add Address
              </button>
            </div>

            {showAddrForm && (
              <form className="addr-form" onSubmit={handleAddrSubmit}>
                <h4 style={{margin:'0 0 16px',fontWeight:700}}>{editingAddr?'Edit':'Add'} Address</h4>
                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Label</label>
                    <select className="form-select" value={addrForm.label} onChange={e=>setAddrForm({...addrForm,label:e.target.value})}>
                      {['home','work','other'].map(l=><option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Full Name</label>
                    <input className="form-input" value={addrForm.full_name} onChange={e=>setAddrForm({...addrForm,full_name:e.target.value})} placeholder="Recipient name"/>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Address Line 1 <span style={{color:'#EF4444'}}>*</span></label>
                  <input className="form-input" required value={addrForm.line1} onChange={e=>setAddrForm({...addrForm,line1:e.target.value})} placeholder="Street, building, area"/>
                </div>
                <div className="form-group">
                  <label className="form-label">Address Line 2</label>
                  <input className="form-input" value={addrForm.line2} onChange={e=>setAddrForm({...addrForm,line2:e.target.value})} placeholder="Landmark, floor (optional)"/>
                </div>
                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">City <span style={{color:'#EF4444'}}>*</span></label>
                    <input className="form-input" required value={addrForm.city} onChange={e=>setAddrForm({...addrForm,city:e.target.value})}/>
                  </div>
                  <div className="form-group">
                    <label className="form-label">State <span style={{color:'#EF4444'}}>*</span></label>
                    <select className="form-select" required value={addrForm.state} onChange={e=>setAddrForm({...addrForm,state:e.target.value})}>
                      <option value="">Select state</option>
                      {STATES.map(s=><option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">PIN Code <span style={{color:'#EF4444'}}>*</span></label>
                    <input className="form-input" required maxLength={6} value={addrForm.pin_code} onChange={e=>setAddrForm({...addrForm,pin_code:e.target.value})} placeholder="6-digit PIN"/>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone</label>
                    <input className="form-input" value={addrForm.phone} onChange={e=>setAddrForm({...addrForm,phone:e.target.value})} placeholder="10-digit mobile"/>
                  </div>
                </div>
                <label className="checkbox-row">
                  <input type="checkbox" checked={addrForm.is_default} onChange={e=>setAddrForm({...addrForm,is_default:e.target.checked})}/>
                  <span>Set as default address</span>
                </label>
                <div style={{display:'flex',gap:10,marginTop:16}}>
                  <button type="submit" className="btn-save-profile">
                    {editingAddr ? 'Update' : 'Save'} Address
                  </button>
                  <button type="button" className="btn-cancel-addr" onClick={()=>{setShowAddrForm(false);setEditingAddr(null);}}>
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {addresses.length === 0 && !showAddrForm && (
              <div className="addr-empty">
                <div style={{fontSize:'3rem',marginBottom:12}}>📭</div>
                <p>No saved addresses yet. Add one for faster checkout!</p>
              </div>
            )}

            <div className="addr-list">
              {addresses.map(addr => (
                <div key={addr.id} className={`addr-card ${addr.is_default?'addr-card--default':''}`}>
                  <div className="addr-card__header">
                    <span className="addr-label">{addr.label||'home'}</span>
                    {addr.is_default && <span className="addr-default-badge">✓ Default</span>}
                  </div>
                  <div className="addr-card__body">
                    <strong>{addr.full_name || 'No name'}</strong><br/>
                    {addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}<br/>
                    {addr.city}, {addr.state} — {addr.pin_code}<br/>
                    {addr.phone && <span>📞 {addr.phone}</span>}
                  </div>
                  <div className="addr-card__actions">
                    <button className="btn-addr-edit" onClick={()=>startEditAddr(addr)}>Edit</button>
                    <button className="btn-addr-delete" onClick={()=>handleDeleteAddr(addr.id)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
