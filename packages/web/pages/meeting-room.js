import { useRouter } from 'next/router';
import Head from 'next/head';

export default function MeetingRoom() {
  const router = useRouter();

  return (
    <>
      <Head>
        <title>Meeting Room Reservations - Reservation Boss</title>
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
        <header className="bg-nh-navy shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => router.push('/')}
                  className="text-nh-teal hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                </button>
                <div>
                  <h1 className="text-3xl font-bold text-white">Meeting Room Reservations</h1>
                  <p className="text-sm text-nh-teal mt-1 font-semibold">Book a meeting room for your team</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <div className="text-8xl mb-6">🏢</div>
            <h2 className="text-3xl font-bold text-nh-navy mb-4">
              Coming Soon
            </h2>
            <p className="text-xl text-gray-700 mb-8 font-medium">
              Meeting room reservation system is under development.
            </p>
            <button
              onClick={() => router.push('/')}
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-bold rounded-lg text-white bg-blue-600 hover:bg-blue-700 shadow-lg transition-colors"
            >
              Back to Home
            </button>
          </div>
        </main>
      </div>
    </>
  );
}
