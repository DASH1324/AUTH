import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo.jpg';
import homeImage from '../assets/coffee.jpg';
import { Eye, EyeOff } from 'lucide-react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './login.css';
import { jwtDecode } from 'jwt-decode';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [usernameError, setUsernameError] = useState(false);
  const [usernameErrorMsg, setUsernameErrorMsg] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [passwordErrorMsg, setPasswordErrorMsg] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isLockedOut, setIsLockedOut] = useState(false);
  const [lockoutTimer, setLockoutTimer] = useState(0);
  const [isLoggingIn, setIsLoggingIn] = useState(false); 
  const navigate = useNavigate();

  const MAX_ATTEMPTS = 5;
  const LOCKOUT_DURATION = 15 * 60; // 15 minutes

  React.useEffect(() => {
    let timer;
    if (isLockedOut && lockoutTimer > 0) {
      timer = setInterval(() => {
        setLockoutTimer((prev) => {
          if (prev <= 1) {
            setIsLockedOut(false);
            setFailedAttempts(0);
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isLockedOut, lockoutTimer]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isLoggingIn) return; // prevent multiple submissions

    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();

    setUsernameError(false);
    setUsernameErrorMsg('');
    setPasswordError(false);
    setPasswordErrorMsg('');

    let hasError = false;

    if (!trimmedUsername) {
      setUsernameError(true);
      setUsernameErrorMsg('Username is required');
      hasError = true;
    } else if (trimmedUsername.length < 3) {
      setUsernameError(true);
      setUsernameErrorMsg('Username must be at least 3 characters');
      hasError = true;
    } else if (trimmedUsername.length > 20) {
      setUsernameError(true);
      setUsernameErrorMsg('Username cannot exceed 20 characters');
      hasError = true;
    } else if (!/^[a-zA-Z0-9_]+$/.test(trimmedUsername)) {
      setUsernameError(true);
      setUsernameErrorMsg('Invalid Input');
      hasError = true;
    }

    if (!trimmedPassword) {
      setPasswordError(true);
      setPasswordErrorMsg('Password cannot be empty');
      hasError = true;
    } else if (trimmedPassword.length < 6) {
      setPasswordError(true);
      setPasswordErrorMsg('Password must be at least 6 characters');
      hasError = true;
    } else if (trimmedPassword.length > 64) {
      setPasswordError(true);
      setPasswordErrorMsg('Password cannot exceed 64 characters');
      hasError = true;
    } else if (/['";\-]/.test(trimmedPassword)) {
      setPasswordError(true);
      setPasswordErrorMsg('Invalid characters in password');
      hasError = true;
    }

    if (hasError) {
      return;
    }

    setIsLoggingIn(true);

    try {
      const formBody = new URLSearchParams();
      formBody.append('username', trimmedUsername);
      formBody.append('password', trimmedPassword);

      const response = await fetch('http://127.0.0.1:4000/auth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formBody.toString(),
      });

      if (response.ok) {
        const data = await response.json();
        const { access_token } = data;

        localStorage.clear();

        // store token and username immediately
        localStorage.setItem('authToken', access_token);
        localStorage.setItem('username', trimmedUsername);
        
        const decodedToken = jwtDecode(access_token);
        const userRole = decodedToken.role;
        const userSystem = decodedToken.system; 

        console.log('User Role:', userRole);
        console.log('User System:', userSystem);
        
        toast.success('Login successful!', {
          position: 'top-right',
          autoClose: 1000,
        });

        // IMS - manager and staff navigation
        if ((userRole === 'manager' || userRole === 'staff') && userSystem === 'IMS') {
          const targetUrl = new URL('http://localhost:3000/home/dashboard/');
          targetUrl.searchParams.append('username', trimmedUsername);
          targetUrl.searchParams.append('authorization', access_token);
          window.location.href = targetUrl.toString();
        }

        // POS - admin and manager navigation 
        else if ((userRole === 'admin' || userRole === 'manager') && userSystem === 'POS') {
          // store role in local storage
          localStorage.setItem('userRole', userRole);
          
          const targetUrl = new URL('http://localhost:4001/home/dashboard/');
          targetUrl.searchParams.append('username', trimmedUsername);
          targetUrl.searchParams.append('authorization', access_token);
          targetUrl.searchParams.append('userRole', userRole);
          
          // debugging logs
          console.log('POS Navigation Debug:');
          console.log('Target URL:', targetUrl.toString());
          console.log('User Role being passed:', userRole);
          console.log('Role stored in localStorage:', localStorage.getItem('userRole'));
          console.log('All URL params:', [...targetUrl.searchParams.entries()]);
          
          window.location.href = targetUrl.toString();
        }

        // POS - cashier navigation
        else if (userRole === 'cashier') {
          const targetUrl = new URL('http://localhost:4001/cashier/menu');
          targetUrl.searchParams.append('username', trimmedUsername);
          targetUrl.searchParams.append('authorization', access_token);
          window.location.href = targetUrl.toString();
        }

        //OOS - admin navigation
        else if (userRole === 'admin' && userSystem === 'OOS') {
          const targetUrl = new URL('http://localhost:5000/admin/dashboard/');
          targetUrl.searchParams.append('username', trimmedUsername);
          targetUrl.searchParams.append('authorization', access_token);
          window.location.href = targetUrl.toString();
        }

        //OOS - rider navigation
        else if (userRole === 'rider' && userSystem === 'OOS') {
          const targetUrl = new URL('http://localhost:5000/rider/home');
          targetUrl.searchParams.append('username', trimmedUsername);
          targetUrl.searchParams.append('authorization', access_token);
          window.location.href = targetUrl.toString();
        }

        //OOS - user navigation
        else if (userRole === 'user' && userSystem === 'OOS') {
          const targetUrl = new URL('http://localhost:5000/');
          targetUrl.searchParams.append('username', trimmedUsername);
          targetUrl.searchParams.append('authorization', access_token);
          window.location.href = targetUrl.toString();
        } 
        
        // UMS - super admin navigation
        else if (userRole === 'superadmin') {
          // Use a small delay to ensure localStorage is set
          setTimeout(() => {
            navigate('/dashboard', { 
              replace: true,
              state: { 
                username: trimmedUsername, 
                authorization: access_token 
              }
            });
          }, 100);
        } 
        else {
          localStorage.removeItem('authToken');
          localStorage.removeItem('username');
          toast.error('Access denied: Your account does not have permission to access this system.', {
            position: 'top-right',
            autoClose: 3000,
          });
          setIsLoggingIn(false);
        }
      } else if (response.status === 401) {
        setFailedAttempts((prev) => {
          const newAttempts = prev + 1;
          if (newAttempts >= MAX_ATTEMPTS) {
            setIsLockedOut(true);
            setLockoutTimer(LOCKOUT_DURATION);
          }
          return newAttempts;
        });
        const attemptsLeft = Math.max(0, MAX_ATTEMPTS - (failedAttempts + 1));
        toast.error(`Invalid username or password. You have ${attemptsLeft} login ${attemptsLeft === 1 ? 'attempt' : 'attempts'} left.`, {
          position: 'top-right',
          autoClose: 3000,
        });
        setIsLoggingIn(false);
      } else if (response.status === 403) {
        try {
          const lockoutResponse = await fetch(`http://127.0.0.1:8000/lockout-status?username=${encodeURIComponent(trimmedUsername)}`);
          if (lockoutResponse.ok) {
            const lockoutData = await lockoutResponse.json();
            setIsLockedOut(true);
            setLockoutTimer(lockoutData.remaining_seconds);
            setFailedAttempts(lockoutData.failed_attempts);
          } else {
            setIsLockedOut(true);
            setLockoutTimer(LOCKOUT_DURATION);
          }
        } catch (error) {
          console.error('Error fetching lockout status:', error);
          setIsLockedOut(true);
          setLockoutTimer(LOCKOUT_DURATION);
        }
        toast.error('Account locked due to too many failed login attempts. Please try again later.', {
          position: 'top-right',
          autoClose: 5000,
        });
        setIsLoggingIn(false);
      } else {
        toast.error('An unexpected error occurred. Please try again.');
        setIsLoggingIn(false);
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Could not connect to the server. Please check your connection.');
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="login-container">
      <ToastContainer />
      <div className="login-box">
        <div className="login-form">
          <div className="logo-wrapper">
            <img src={logo} alt="Logo" className="circle-logo" />
          </div>
          <h2>Welcome Back</h2>
          <p>Please Enter Your Details To Log In.</p>
          <form onSubmit={handleSubmit}>
            <div className={`form-group ${usernameError ? 'input-error' : ''}`}>
              <label htmlFor="username">Username</label>
              <input
                type="text"
                id="username"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                disabled={isLoggingIn}
              />
              {usernameError && <div className="error-message">{usernameErrorMsg}</div>}
            </div>
            <div className={`form-group password-group ${passwordError ? 'input-error' : ''}`}>
              <label htmlFor="password">Password</label>
              <div className="password-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  disabled={isLoggingIn}
                />
                <span
                  className="toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ cursor: 'pointer' }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </span>
              </div>
              {passwordError && <div className="error-message">{passwordErrorMsg}</div>}
            </div>
            <div className="forgot-password">
              <a href="/forgot-password">Forgot password?</a>
            </div>
            <button 
              type="submit" 
              className="login-button"
              disabled={isLoggingIn || isLockedOut}
            >
              {isLoggingIn ? 'Logging In...' : 'Log In'}
            </button>
          </form>
          {isLockedOut && (
            <div className="lockout-message" style={{ color: 'red', marginTop: '10px' }}>
              <p>Your account is locked. Please try again in {Math.floor(lockoutTimer / 60).toString().padStart(2, '0')}:{(lockoutTimer % 60).toString().padStart(2, '0')} minutes.</p>
            </div>
          )}
          <div className="signup-link">
            Don't have an account? <a href="/signup">Sign up</a>
          </div>
        </div>
        <div
          className="login-image"
          style={{ backgroundImage: `url(${homeImage})` }}
        >
          <div className="brand-logo"></div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;