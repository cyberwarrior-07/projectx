import { BookOpen, Users, Award, Globe } from 'lucide-react';

export function About() {
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-4xl font-bold gradient-text mb-8">About ProjectX</h1>
      
      <div className="prose prose-invert max-w-none mb-12">
        <p className="text-xl text-gray-300">
          ProjectX is a cutting-edge learning platform designed to make programming education accessible, 
          interactive, and effective for students of all skill levels.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
        <div className="glass-effect rounded-lg p-6">
          <div className="flex items-center mb-4">
            <BookOpen className="h-8 w-8 text-blue-400 mr-3" />
            <h2 className="text-2xl font-semibold text-white">Our Mission</h2>
          </div>
          <p className="text-gray-300">
            To provide high-quality programming education that empowers learners to achieve their 
            goals through practical, hands-on learning experiences.
          </p>
        </div>

        <div className="glass-effect rounded-lg p-6">
          <div className="flex items-center mb-4">
            <Users className="h-8 w-8 text-green-400 mr-3" />
            <h2 className="text-2xl font-semibold text-white">Our Community</h2>
          </div>
          <p className="text-gray-300">
            Join thousands of students and instructors in our vibrant learning community, 
            sharing knowledge and growing together.
          </p>
        </div>
      </div>

      <div className="glass-effect rounded-lg p-8 mb-16">
        <h2 className="text-3xl font-bold gradient-text mb-6">Why Choose ProjectX?</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-start">
            <Award className="h-6 w-6 text-yellow-400 mr-3 mt-1" />
            <div>
              <h3 className="text-xl font-semibold text-white mb-2">Quality Content</h3>
              <p className="text-gray-300">
                Expert-crafted courses with real-world applications and industry best practices.
              </p>
            </div>
          </div>
          <div className="flex items-start">
            <Globe className="h-6 w-6 text-blue-400 mr-3 mt-1" />
            <div>
              <h3 className="text-xl font-semibold text-white mb-2">Global Access</h3>
              <p className="text-gray-300">
                Learn from anywhere, anytime, with our flexible online platform.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="glass-effect rounded-lg p-8">
        <h2 className="text-3xl font-bold gradient-text mb-6">Our Values</h2>
        <div className="space-y-6">
          <div className="flex items-center">
            <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center mr-4">
              <span className="text-2xl text-blue-400">1</span>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white">Innovation</h3>
              <p className="text-gray-300">Constantly evolving our platform with cutting-edge technology.</p>
            </div>
          </div>
          <div className="flex items-center">
            <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mr-4">
              <span className="text-2xl text-green-400">2</span>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white">Excellence</h3>
              <p className="text-gray-300">Maintaining the highest standards in educational content.</p>
            </div>
          </div>
          <div className="flex items-center">
            <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center mr-4">
              <span className="text-2xl text-purple-400">3</span>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white">Community</h3>
              <p className="text-gray-300">Fostering a supportive environment for learning and growth.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}