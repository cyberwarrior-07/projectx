import { useNavigate } from 'react-router-dom';
import { GraduationCap, BookOpen, Code, Layout, Globe, Users, ArrowRight } from 'lucide-react';
import { Button } from '../components/ui/Button';

export function Home() {
  const navigate = useNavigate();

  return (
    <div>
      {/* Hero Section */}
      <div className="flex flex-col items-center justify-center min-h-[80vh] text-center">
        <h1 className="text-5xl font-bold gradient-text mb-6">
          Welcome to ProjectX
        </h1>
        <p className="text-xl text-gray-400 mb-8 max-w-2xl">
          Master programming through interactive coding exercises and real-world projects
        </p>
        <div className="flex gap-4">
          <Button
            size="lg"
            className="card-hover"
            onClick={() => navigate('/courses')}
          >
            <BookOpen className="h-5 w-5 mr-2" />
            Browse Courses
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="card-hover"
            onClick={() => navigate('/dashboard')}
          >
            <GraduationCap className="h-5 w-5 mr-2" />
            My Learning
          </Button>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold gradient-text text-center mb-12">Why Choose ProjectX?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="glass-effect rounded-lg p-6 text-center">
              <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Code className="h-6 w-6 text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Interactive Labs</h3>
              <p className="text-gray-400">Practice with hands-on coding exercises and get instant feedback</p>
            </div>
            <div className="glass-effect rounded-lg p-6 text-center">
              <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Code className="h-6 w-6 text-green-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Live Code Editor</h3>
              <p className="text-gray-400">Write, run and test your code directly in the browser</p>
            </div>
            <div className="glass-effect rounded-lg p-6 text-center">
              <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Users className="h-6 w-6 text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Community Support</h3>
              <p className="text-gray-400">Join our community of learners and get help when you need it</p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-20 px-4">
        <div className="max-w-4xl mx-auto glass-effect rounded-lg p-12 text-center">
          <h2 className="text-3xl font-bold gradient-text mb-6">Ready to Start Learning?</h2>
          <p className="text-xl text-gray-400 mb-8">Join thousands of students already learning on ProjectX</p>
          <Button size="lg" onClick={() => navigate('/courses')}>
            Get Started
            <ArrowRight className="h-5 w-5 ml-2" />
          </Button>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-12 mt-20 w-full">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center mb-4">
              <BookOpen className="h-8 w-8 text-[#ff6600] mr-2" />
              <span className="text-xl font-bold gradient-text">ProjectX</span>
            </div>
            <p className="text-gray-400">Empowering learners with practical programming education</p>
          </div>
          <div>
            <h3 className="text-white font-semibold mb-4">Platform</h3>
            <ul className="space-y-2">
              <li><a href="/courses" className="text-gray-400 hover:text-white">Courses</a></li>
              <li><a href="/about" className="text-gray-400 hover:text-white">About Us</a></li>
              <li><a href="/contact" className="text-gray-400 hover:text-white">Contact</a></li>
            </ul>
          </div>
          <div>
            <h3 className="text-white font-semibold mb-4">Resources</h3>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-400 hover:text-white">Documentation</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white">Blog</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white">Community</a></li>
            </ul>
          </div>
          <div>
            <h3 className="text-white font-semibold mb-4">Legal</h3>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-400 hover:text-white">Privacy Policy</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white">Terms of Service</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white">Cookie Policy</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 mt-8 pt-8 border-t border-gray-800">
          <p className="text-center text-gray-400">© {new Date().getFullYear()} ProjectX. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}