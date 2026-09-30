export default function TicketPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl text-center">
        <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-blue-500/10 ring-8 ring-blue-500/5">
          <svg className="w-10 h-10 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </div>
        
        <h2 className="text-2xl font-bold text-white mb-4">We've Gone Mobile!</h2>
        <p className="text-slate-400 mb-8 leading-relaxed">
          To provide you with a better experience, all service tickets must now be raised through our new EV Service mobile app. You can track your ticket status and history directly from your phone!
        </p>

        <div className="flex flex-col gap-4">
          <a href="#" className="flex items-center justify-center w-full py-3 px-4 bg-white hover:bg-slate-100 text-slate-900 rounded-xl font-semibold transition">
            Download for iOS
          </a>
          <a href="#" className="flex items-center justify-center w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-xl font-semibold transition">
            Download for Android
          </a>
        </div>
      </div>
    </div>
  );
}
