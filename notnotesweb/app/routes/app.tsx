import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { setAuthToken } from '~/utils';
import { useNavigate } from 'react-router';

// Animation variants for the form container
const formVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.3 } },
};

const App = () => {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [userId, setUserId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Function to verify the authentication token with the backend
  const verifyToken = async () => {
    setIsLoading(true);
    const token = localStorage.getItem('notnotes_auth_token');
    if (!token) {
      setUserId(null);
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/v1/protected', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        // Assuming the protected endpoint returns some user data on success
        const data = await response.json();
        setUserId(data.userId || 'Authenticated User');
      } else {
        localStorage.removeItem('notnotes_auth_token');
        setUserId(null);
        console.error('Token verification failed:', response.statusText);
      }
    } catch (error) {
      console.error('Error verifying token:', error);
      localStorage.removeItem('notnotes_auth_token');
      setUserId(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Check auth status on component mount
  useEffect(() => {
    verifyToken();
  }, []);

  const navigate = useNavigate();

  const handleAuth = async (event: { preventDefault: () => void; }) => {
    event.preventDefault();
    setMessage('');
    const endpoint = isLoginMode ? '/api/v1/auth/login' : '/api/v1/auth/register';

    if (!isLoginMode && password !== confirmPassword) {
      setMessage('Passwords do not match.');
      return;
    }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        setAuthToken(data.token)
        setUserId(data.userId || 'Authenticated User');
        setMessage(isLoginMode ? 'Login successful!' : 'Registration successful! Welcome to Notnotes.');
        navigate("/core")
      } else {
        setMessage(`Error: ${data.message || 'An unexpected error occurred.'}`);
        setUserId(null);
      }
    } catch (error) {
      console.error("Authentication Error:", error);
      setMessage(`Error: ${error}`);
      setUserId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-950 text-neutral-200">
        <p>Initializing...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-950 text-neutral-200 p-6 font-sans">
      <header className="absolute top-0 left-0 right-0 flex justify-between items-center px-6 py-4">
        <div className="font-bold text-2xl tracking-tighter">NOTNOTES</div>
      </header>

      <motion.div
        className="w-full max-w-sm p-8 bg-neutral-900 rounded-xl shadow-lg"
        variants={formVariants}
        initial="hidden"
        animate="visible"
      >
        <h1 className="text-3xl font-bold text-center mb-6">
          {isLoginMode ? 'Sign In' : 'Register'}
        </h1>

        <form onSubmit={handleAuth} className="flex flex-col space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
            className="p-3 bg-neutral-800 text-neutral-200 rounded-lg border-2 border-transparent focus:border-neutral-500 focus:outline-none placeholder-neutral-500"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
            className="p-3 bg-neutral-800 text-neutral-200 rounded-lg border-2 border-transparent focus:border-neutral-500 focus:outline-none placeholder-neutral-500"
          />
          {!isLoginMode && (
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm Password"
              required
              className="p-3 bg-neutral-800 text-neutral-200 rounded-lg border-2 border-transparent focus:border-neutral-500 focus:outline-none placeholder-neutral-500"
            />
          )}

          <motion.button
            type="submit"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="px-6 py-3 mt-4 bg-neutral-200 text-neutral-950 font-medium rounded-lg hover:bg-neutral-400 transition-colors"
          >
            {isLoginMode ? 'Sign In' : 'Register'}
          </motion.button>
        </form>

        {message && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`mt-4 text-center text-sm ${message.startsWith('Error') ? 'text-red-400' : 'text-green-400'}`}
          >
            {message}
          </motion.p>
        )}

        <p className="mt-6 text-center text-sm">
          {isLoginMode ? "Don't have an account?" : "Already have an account?"}{' '}
          <button
            onClick={() => setIsLoginMode(!isLoginMode)}
            className="text-neutral-500 hover:text-neutral-200 transition-colors"
          >
            {isLoginMode ? 'Register' : 'Sign In'}
          </button>
        </p>

        {userId && (
          <p className="mt-4 text-center text-xs text-neutral-600">
            User ID: {userId}
          </p>
        )}
      </motion.div>

      <footer className="absolute bottom-0 left-0 right-0 text-center text-neutral-600 py-4">
        <p className="text-sm">
          © {new Date().getFullYear()} NOTNOTES. All Rights Reserved.
        </p>
      </footer>
    </div>
  );
};

export default App;
