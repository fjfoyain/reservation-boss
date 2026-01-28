import { useRouter } from 'next/router';
import Head from 'next/head';

export default function Home() {
  const router = useRouter();

  const resources = [
    {
      id: 'parking',
      title: 'Parking',
      description: 'Reserve your parking spot for the week',
      icon: '🚗',
      path: '/parking',
      available: true
    },
    {
      id: 'meeting-room',
      title: 'Meeting Room',
      description: 'Book a meeting room for your team',
      icon: '🏢',
      path: '/meeting-room',
      available: true
    },
    {
      id: 'booths',
      title: 'Booths',
      description: 'Reserve a booth for focused work',
      icon: '📞',
      path: '/booths',
      available: true
    }
  ];

  return (
    <>
      <Head>
        <title>Reservation Boss - North Highland</title>
        <meta name="description" content="Resource reservation system for North Highland offices" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        {/* Header */}
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Reservation Boss</h1>
                <p className="text-sm text-gray-600 mt-1">North Highland Office Resources</p>
              </div>
              <button
                onClick={() => router.push('/login')}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
              >
                Admin Login
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-extrabold text-gray-900 sm:text-5xl">
              What would you like to reserve?
            </h2>
            <p className="mt-4 text-xl text-gray-600">
              Choose a resource to get started
            </p>
          </div>

          {/* Resource Cards */}
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {resources.map((resource) => (
              <div
                key={resource.id}
                onClick={() => resource.available && router.push(resource.path)}
                className={`
                  relative bg-white rounded-2xl shadow-lg overflow-hidden transform transition-all duration-300
                  ${resource.available 
                    ? 'hover:scale-105 hover:shadow-2xl cursor-pointer' 
                    : 'opacity-60 cursor-not-allowed'}
                `}
              >
                {/* Card Content */}
                <div className="p-8">
                  <div className="text-6xl mb-4">{resource.icon}</div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    {resource.title}
                  </h3>
                  <p className="text-gray-600 mb-6">
                    {resource.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className={`
                      px-3 py-1 rounded-full text-xs font-semibold
                      ${resource.available 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'}
                    `}>
                      {resource.available ? 'Available' : 'Coming Soon'}
                    </span>
                    {resource.available && (
                      <svg 
                        className="w-6 h-6 text-indigo-600" 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth={2} 
                          d="M9 5l7 7-7 7" 
                        />
                      </svg>
                    )}
                  </div>
                </div>

                {/* Hover Effect Border */}
                <div className="absolute inset-0 border-4 border-transparent hover:border-indigo-500 rounded-2xl pointer-events-none transition-colors duration-300" />
              </div>
            ))}
          </div>

          {/* Footer Info */}
          <div className="mt-16 text-center">
            <p className="text-gray-600">
              Need help? Contact{' '}
              <a href="mailto:support@northhighland.com" className="text-indigo-600 hover:text-indigo-800 font-medium">
                support@northhighland.com
              </a>
            </p>
          </div>
        </main>
      </div>
    </>
  );
}
