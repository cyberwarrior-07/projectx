import { Code, Video, FileText, MessageSquare, Users, Award } from 'lucide-react';

export function Services() {
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-4xl font-bold gradient-text mb-8">Our Services</h1>

      <div className="prose prose-invert max-w-none mb-12">
        <p className="text-xl text-gray-300">
          Discover our comprehensive range of educational services designed to help you master 
          programming and advance your career in technology.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
        <div className="glass-effect rounded-lg p-6 hover:bg-gray-800/50 transition-all">
          <div className="flex items-center mb-4">
            <Code className="h-8 w-8 text-blue-400 mr-3" />
            <h2 className="text-2xl font-semibold text-white">Interactive Coding</h2>
          </div>
          <p className="text-gray-300 mb-4">
            Practice coding in real-time with our interactive editor and compiler. Get instant 
            feedback and learn by doing.
          </p>
          <ul className="space-y-2 text-gray-300">
            <li className="flex items-center">
              <span className="w-2 h-2 bg-blue-400 rounded-full mr-2"></span>
              Multiple programming languages
            </li>
            <li className="flex items-center">
              <span className="w-2 h-2 bg-blue-400 rounded-full mr-2"></span>
              Real-time compilation
            </li>
            <li className="flex items-center">
              <span className="w-2 h-2 bg-blue-400 rounded-full mr-2"></span>
              Code sharing capabilities
            </li>
          </ul>
        </div>

        <div className="glass-effect rounded-lg p-6 hover:bg-gray-800/50 transition-all">
          <div className="flex items-center mb-4">
            <Video className="h-8 w-8 text-green-400 mr-3" />
            <h2 className="text-2xl font-semibold text-white">Video Lessons</h2>
          </div>
          <p className="text-gray-300 mb-4">
            Access high-quality video content created by industry experts. Learn at your own pace 
            with our comprehensive curriculum.
          </p>
          <ul className="space-y-2 text-gray-300">
            <li className="flex items-center">
              <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
              HD quality content
            </li>
            <li className="flex items-center">
              <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
              Downloadable resources
            </li>
            <li className="flex items-center">
              <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
              Progress tracking
            </li>
          </ul>
        </div>
      </div>

      <div className="glass-effect rounded-lg p-8 mb-16">
        <h2 className="text-3xl font-bold gradient-text mb-6">Premium Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <MessageSquare className="h-12 w-12 text-purple-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">1:1 Mentoring</h3>
            <p className="text-gray-300">
              Get personalized guidance from experienced developers.
            </p>
          </div>
          <div className="text-center">
            <Users className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Study Groups</h3>
            <p className="text-gray-300">
              Join collaborative learning sessions with peers.
            </p>
          </div>
          <div className="text-center">
            <Award className="h-12 w-12 text-blue-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Certification</h3>
            <p className="text-gray-300">
              Earn recognized certificates upon course completion.
            </p>
          </div>
        </div>
      </div>

      <div className="glass-effect rounded-lg p-8">
        <h2 className="text-3xl font-bold gradient-text mb-6">Course Categories</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-center p-4 bg-gray-800/50 rounded-lg">
            <FileText className="h-8 w-8 text-blue-400 mr-4" />
            <div>
              <h3 className="text-xl font-semibold text-white">Web Development</h3>
              <p className="text-gray-300">HTML, CSS, JavaScript, and modern frameworks</p>
            </div>
          </div>
          <div className="flex items-center p-4 bg-gray-800/50 rounded-lg">
            <FileText className="h-8 w-8 text-green-400 mr-4" />
            <div>
              <h3 className="text-xl font-semibold text-white">Mobile Development</h3>
              <p className="text-gray-300">iOS, Android, and cross-platform development</p>
            </div>
          </div>
          <div className="flex items-center p-4 bg-gray-800/50 rounded-lg">
            <FileText className="h-8 w-8 text-purple-400 mr-4" />
            <div>
              <h3 className="text-xl font-semibold text-white">Data Science</h3>
              <p className="text-gray-300">Python, R, and machine learning</p>
            </div>
          </div>
          <div className="flex items-center p-4 bg-gray-800/50 rounded-lg">
            <FileText className="h-8 w-8 text-yellow-400 mr-4" />
            <div>
              <h3 className="text-xl font-semibold text-white">Cloud Computing</h3>
              <p className="text-gray-300">AWS, Azure, and Google Cloud</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}