import { useState } from 'react'
import { useMutation, useAction } from 'convex/react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from '../../../convex/_generated/api'

// ═══════════════════════════════════════════════════════════════════
// WHATSAPP HUB - Admin panel for WhatsApp integration
// ═══════════════════════════════════════════════════════════════════

interface WhatsAppHubProps {
  adminToken: string
}

const TEMPLATES = [
  { id: 'welcome', name: 'Welcome Message', icon: '👋', description: 'Welcome new users to the platform' },
  { id: 'payment', name: 'Payment Confirmation', icon: '💳', description: 'Confirm payment receipt' },
  { id: 'service', name: 'Service Update', icon: '📢', description: 'Notify about new features' },
  { id: 'appointment', name: 'Appointment Reminder', icon: '📅', description: 'Remind about upcoming appointments' },
  { id: 'order', name: 'Order Update', icon: '📦', description: 'Update on order status' },
]

export function WhatsAppHub({ adminToken }: WhatsAppHubProps) {
  const [activeSection, setActiveSection] = useState<'send' | 'bulk' | 'templates' | 'logs'>('send')
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  
  // Single message form
  const [singleForm, setSingleForm] = useState({
    phoneNumber: '',
    message: '',
    mediaUrl: '',
  })

  // Bulk message form
  const [bulkForm, setBulkForm] = useState({
    phoneNumbers: '',
    message: '',
    mediaUrl: '',
  })

  // Template form
  const [templateForm, setTemplateForm] = useState({
    phoneNumber: '',
    templateName: 'welcome',
    userName: '',
  })

  const { data: whatsappStatus } = useSuspenseQuery(convexQuery(api.whatsapp_integration.getWhatsAppStatus, { adminToken }))
  const { data: whatsappLogs } = useSuspenseQuery(convexQuery(api.whatsapp_integration.getWhatsAppLogs, { adminToken, limit: 20 }))
  
  const sendMessage = useAction(api.whatsapp_integration.sendWhatsAppMessage)
  const sendBulk = useAction(api.whatsapp_integration.sendWhatsAppBulk)
  const sendWelcome = useAction(api.whatsapp_integration.sendWelcomeMessage)
  const sendPayment = useAction(api.whatsapp_integration.sendPaymentConfirmation)
  const sendServiceUpdate = useAction(api.whatsapp_integration.sendServiceUpdate)
  const sendAppointment = useAction(api.whatsapp_integration.sendAppointmentReminder)
  const sendOrder = useAction(api.whatsapp_integration.sendOrderUpdate)

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 4000)
  }

  const handleSendSingle = async () => {
    if (!singleForm.phoneNumber || !singleForm.message) {
      showToast('error', 'Phone number and message are required')
      return
    }
    try {
      const result = await sendMessage({
        adminToken,
        phoneNumber: singleForm.phoneNumber,
        message: singleForm.message,
        mediaUrl: singleForm.mediaUrl || undefined,
      })
      if (result.success) {
        showToast('success', 'Message sent successfully!')
        setSingleForm({ phoneNumber: '', message: '', mediaUrl: '' })
      } else {
        showToast('error', result.error || 'Failed to send')
      }
    } catch (err: any) {
      showToast('error', err.message || 'Failed to send')
    }
  }

  const handleSendBulk = async () => {
    if (!bulkForm.phoneNumbers || !bulkForm.message) {
      showToast('error', 'Phone numbers and message are required')
      return
    }
    const phones = bulkForm.phoneNumbers.split(',').map(p => p.trim()).filter(p => p)
    try {
      const result = await sendBulk({
        adminToken,
        phoneNumbers: phones,
        message: bulkForm.message,
        mediaUrl: bulkForm.mediaUrl || undefined,
      })
      if (result.success) {
        showToast('success', `Sent ${result.sent}/${result.total} messages`)
        setBulkForm({ phoneNumbers: '', message: '', mediaUrl: '' })
      } else {
        showToast('error', result.error || 'Failed to send')
      }
    } catch (err: any) {
      showToast('error', err.message || 'Failed to send')
    }
  }

  const handleSendTemplate = async (templateId: string) => {
    try {
      let result
      switch (templateId) {
        case 'welcome':
          result = await sendWelcome({ adminToken, phoneNumber: templateForm.phoneNumber, userName: templateForm.userName })
          break
        case 'payment':
          result = await sendPayment({ adminToken, phoneNumber: templateForm.phoneNumber, userName: templateForm.userName, amount: 15000, plan: 'Professional', reference: `DKV${Date.now()}` })
          break
        case 'service':
          result = await sendServiceUpdate({ adminToken, phoneNumbers: [templateForm.phoneNumber], title: 'New Feature Alert', description: 'We just launched new features!', features: ['AI-Powered Ad Generator', 'Video Production System', 'Automated Posting'] })
          break
        case 'appointment':
          result = await sendAppointment({ adminToken, phoneNumber: templateForm.phoneNumber, userName: templateForm.userName, appointmentType: 'Consultation', dateTime: 'Tomorrow at 10 AM' })
          break
        case 'order':
          result = await sendOrder({ adminToken, phoneNumber: templateForm.phoneNumber, orderId: `ORD${Date.now()}`, status: 'Processing' })
          break
      }
      if (result?.success) {
        showToast('success', 'Template message sent!')
      } else {
        showToast('error', result?.error || 'Failed to send')
      }
    } catch (err: any) {
      showToast('error', err.message || 'Failed to send')
    }
  }

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-2xl shadow-2xl font-bold text-sm ${toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tighter text-white flex items-center gap-2">
            📱 WhatsApp Integration
          </h2>
          <p className="text-xs text-slate-400 mt-1">Send automated messages via WhatsApp Business API</p>
        </div>
        <div className={`px-4 py-2 rounded-xl text-sm font-bold ${whatsappStatus?.configured ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
          {whatsappStatus?.status || 'Checking...'}
        </div>
      </div>

      {/* Section Tabs */}
      <div className="flex gap-2 bg-white/5 border border-white/10 rounded-xl p-1">
        {[
          { id: 'send', label: 'Send Message', icon: '📤' },
          { id: 'bulk', label: 'Bulk Messages', icon: '📨' },
          { id: 'templates', label: 'Templates', icon: '📋' },
          { id: 'logs', label: 'Message Logs', icon: '📝' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSection(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeSection === tab.id
                ? 'bg-emerald-500 text-white'
                : 'text-slate-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Send Message Section */}
      {activeSection === 'send' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h3 className="text-lg font-black text-white mb-4">Send WhatsApp Message</h3>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-slate-400">Phone Number (Nigerian format: 08012345678)</label>
              <input
                type="tel"
                value={singleForm.phoneNumber}
                onChange={(e) => setSingleForm({ ...singleForm, phoneNumber: e.target.value })}
                placeholder="+234 801 234 5678"
                className="w-full bg-slate-800 text-white rounded-xl px-4 py-3 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400">Message</label>
              <textarea
                value={singleForm.message}
                onChange={(e) => setSingleForm({ ...singleForm, message: e.target.value })}
                placeholder="Enter your message..."
                className="w-full bg-slate-800 text-white rounded-xl px-4 py-3 text-sm h-24"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400">Media URL (optional)</label>
              <input
                type="url"
                value={singleForm.mediaUrl}
                onChange={(e) => setSingleForm({ ...singleForm, mediaUrl: e.target.value })}
                placeholder="https://example.com/image.jpg"
                className="w-full bg-slate-800 text-white rounded-xl px-4 py-3 text-sm"
              />
            </div>
            <button
              onClick={handleSendSingle}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold transition-all"
            >
              📤 Send Message
            </button>
          </div>
        </div>
      )}

      {/* Bulk Messages Section */}
      {activeSection === 'bulk' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h3 className="text-lg font-black text-white mb-4">Send Bulk Messages</h3>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-slate-400">Phone Numbers (comma-separated)</label>
              <textarea
                value={bulkForm.phoneNumbers}
                onChange={(e) => setBulkForm({ ...bulkForm, phoneNumbers: e.target.value })}
                placeholder="+2348012345678, +2348098765432, ..."
                className="w-full bg-slate-800 text-white rounded-xl px-4 py-3 text-sm h-20"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400">Message</label>
              <textarea
                value={bulkForm.message}
                onChange={(e) => setBulkForm({ ...bulkForm, message: e.target.value })}
                placeholder="Enter your message..."
                className="w-full bg-slate-800 text-white rounded-xl px-4 py-3 text-sm h-24"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400">Media URL (optional)</label>
              <input
                type="url"
                value={bulkForm.mediaUrl}
                onChange={(e) => setBulkForm({ ...bulkForm, mediaUrl: e.target.value })}
                placeholder="https://example.com/image.jpg"
                className="w-full bg-slate-800 text-white rounded-xl px-4 py-3 text-sm"
              />
            </div>
            <button
              onClick={handleSendBulk}
              className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold transition-all"
            >
              📨 Send Bulk Messages
            </button>
          </div>
        </div>
      )}

      {/* Templates Section */}
      {activeSection === 'templates' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h3 className="text-lg font-black text-white mb-4">Message Templates</h3>
          
          {/* Template Form */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="text-xs text-slate-400">Phone Number</label>
              <input
                type="tel"
                value={templateForm.phoneNumber}
                onChange={(e) => setTemplateForm({ ...templateForm, phoneNumber: e.target.value })}
                placeholder="+234 801 234 5678"
                className="w-full bg-slate-800 text-white rounded-xl px-4 py-3 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400">User Name</label>
              <input
                type="text"
                value={templateForm.userName}
                onChange={(e) => setTemplateForm({ ...templateForm, userName: e.target.value })}
                placeholder="John Doe"
                className="w-full bg-slate-800 text-white rounded-xl px-4 py-3 text-sm"
              />
            </div>
          </div>

          {/* Template Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {TEMPLATES.map((template) => (
              <div key={template.id} className="bg-slate-800 border border-slate-700 rounded-xl p-4 hover:border-emerald-500/50 transition-all">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">{template.icon}</span>
                  <div>
                    <div className="text-sm font-bold text-white">{template.name}</div>
                    <div className="text-xs text-slate-400">{template.description}</div>
                  </div>
                </div>
                <button
                  onClick={() => handleSendTemplate(template.id)}
                  className="w-full mt-3 py-2 bg-emerald-500/20 text-emerald-400 rounded-lg text-xs font-bold hover:bg-emerald-500/30 transition-all"
                >
                  Send Template
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Message Logs Section */}
      {activeSection === 'logs' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h3 className="text-lg font-black text-white mb-4">Message Logs</h3>
          <div className="space-y-2">
            {whatsappLogs && whatsappLogs.length > 0 ? (
              whatsappLogs.map((log: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 bg-slate-800 rounded-xl">
                  <div className="flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full ${log.status === 'sent' ? 'bg-emerald-400' : 'bg-red-400'}`} />
                    <div>
                      <div className="text-sm text-white font-medium">{log.phoneNumber}</div>
                      <div className="text-xs text-slate-400">{log.messageType} • {new Date(log.timestamp).toLocaleString()}</div>
                    </div>
                  </div>
                  <span className={`text-xs font-bold ${log.status === 'sent' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {log.status}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-slate-400">
                <p className="text-4xl mb-2">📝</p>
                <p className="font-bold">No messages sent yet</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
