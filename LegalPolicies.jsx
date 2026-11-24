import React, { useState } from 'react';

export default function LegalPolicies() {
  const [activeModal, setActiveModal] = useState(null);

  const policies = {
    returns: {
      title: '7-Day Easy Return & Refund Policy',
      content:
        'Customers may request a replacement or full refund within 7 days of delivery for damaged, defective, or incorrect items. Refunds are processed to the original UPI/Bank account within 5-7 business days after reverse pickup verification.'
    },
    privacy: {
      title: 'Privacy Policy (DPDP Act Compliant)',
      content:
        'We collect customer name, phone number, and delivery address strictly for order fulfillment and courier tracking. Payment details are encrypted and processed via RBI-compliant payment gateways (Razorpay). We never sell user data.'
    },
    grievance: {
      title: 'Grievance Officer & Statutory Disclosures',
      content:
        'In accordance with Consumer Protection (E-Commerce) Rules, 2020:\n• Legal Entity Name: UrbanKart Retail Enterprises\n• Grievance Officer: [Your Name]\n• Email: support@yourdomain.in | Phone: +91-XXXXXXXXXX\n• Response SLA: Within 48 hours of complaint receipt.'
    }
  };

  return (
    <footer className="bg-slate-900 text-slate-300 py-8 px-4 mt-16 border-t border-slate-800">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-sm">
        <div>
          <p className="font-semibold text-white">UrbanKart India</p>
          <p className="text-xs text-slate-400">100% Authentic Products • GST Compliant Billing • Pan-India Delivery</p>
        </div>
        <div className="flex gap-6">
          <button onClick={() => setActiveModal('returns')} className="hover:text-white underline">
            Return & Refund Policy
          </button>
          <button onClick={() => setActiveModal('privacy')} className="hover:text-white underline">
            Privacy Policy
          </button>
          <button onClick={() => setActiveModal('grievance')} className="hover:text-white underline">
            Grievance Officer
          </button>
        </div>
      </div>

      {activeModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white text-slate-800 rounded-xl max-w-lg w-full p-6 shadow-xl">
            <h3 className="text-lg font-bold mb-3">{policies[activeModal].title}</h3>
            <p className="text-sm text-slate-600 whitespace-pre-line leading-relaxed">
              {policies[activeModal].content}
            </p>
            <button
              onClick={() => setActiveModal(null)}
              className="mt-5 w-full bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </footer>
  );
}
