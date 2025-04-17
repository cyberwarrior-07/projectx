import { Mail, Phone, MapPin, Send } from 'lucide-react';
import { Button } from '../components/ui/Button';

export function Contact() {
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-4xl font-bold gradient-text mb-8">Contact Us</h1>

      <div className="prose prose-invert max-w-none mb-12">
        <p className="text-xl text-gray-300">
          Have questions? We're here to help. Reach out to our team through any of the channels below.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
        <div className="space-y-8">
          <div className="glass-effect rounded-lg p-6">
            <h2 className="text-2xl font-semibold text-white mb-6">Get in Touch</h2>
            <div className="space-y-4">
              <div className="flex items-center">
                <Mail className="h-6 w-6 text-blue-400 mr-3" />
                <div>
                  <p className="text-sm text-gray-400">Email</p>
                  <p className="text-white">support@educode.com</p>
                </div>
              </div>
              <div className="flex items-center">
                <Phone className="h-6 w-6 text-green-400 mr-3" />
                <div>
                  <p className="text-sm text-gray-400">Phone</p>
                  <p className="text-white">+1 (555) 123-4567</p>
                </div>
              </div>
              <div className="flex items-center">
                <MapPin className="h-6 w-6 text-purple-400 mr-3" />
                <div>
                  <p className="text-sm text-gray-400">Address</p>
                  <p className="text-white">123 Learning Street, Education City, 12345</p>
                </div>
              </div>
            </div>
          </div>

          <div className="glass-effect rounded-lg p-6">
            <h2 className="text-2xl font-semibold text-white mb-6">Office Hours</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-300">Monday - Friday</span>
                <span className="text-white">9:00 AM - 6:00 PM</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Saturday</span>
                <span className="text-white">10:00 AM - 4:00 PM</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Sunday</span>
                <span className="text-white">Closed</span>
              </div>
            </div>
          </div>
        </div>

        <div className="glass-effect rounded-lg p-6">
          <h2 className="text-2xl font-semibold text-white mb-6">Send us a Message</h2>
          <form className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Name
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email
              </label>
              <input
                type="email"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Subject
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Message
              </label>
              <textarea
                rows={4}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              ></textarea>
            </div>
            <Button type="submit" className="w-full">
              <Send className="h-5 w-5 mr-2" />
              Send Message
            </Button>
          </form>
        </div>
      </div>

      <div className="glass-effect rounded-lg p-8">
        <h2 className="text-2xl font-semibold text-white mb-6">Frequently Asked Questions</h2>
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium text-white mb-2">How do I start a course?</h3>
            <p className="text-gray-300">
              Simply create an account, browse our course catalog, and enroll in any course that interests you.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-medium text-white mb-2">What payment methods do you accept?</h3>
            <p className="text-gray-300">
              We accept all major credit cards, PayPal, and bank transfers for course payments.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-medium text-white mb-2">Can I get a refund?</h3>
            <p className="text-gray-300">
              Yes, we offer a 30-day money-back guarantee if you're not satisfied with your course.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}