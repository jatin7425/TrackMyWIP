// public/home.js

document.addEventListener('DOMContentLoaded', async () => {

    // Get the container for the auth forms
    const authContainer = document.getElementById('home-container-right');

    // If the container doesn't exist on the page, don't run
    if (!authContainer) {
        console.error('Error: Auth container #home-container-right not found.');
        return;
    }

    // ---- Helper to reset *only* the auth container ----
    const clearAuthContainer = () => {
        authContainer.innerHTML = '';
    };

    // ---- Signup Form ----
    const renderSignupForm = () => {
        clearAuthContainer();

        const form = document.createElement('form');
        form.id = 'signup-form';
        form.innerHTML = `
      <h2>Create Account</h2>

      <label for="username">Username</label>
      <input type="text" id="username" name="username" required>

      <label for="mobile">Mobile Number</label>
      <input type="text" id="mobile" name="mobile" required maxlength="10" pattern="\\d{10}">

      <button type="submit">Sign Up</button>
      <p><a href="#" id="login-link">Already have an account? Log in here.</a></p>
    `;

        authContainer.appendChild(form);

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = form.username.value.trim();
            const mobile = form.mobile.value.trim();

            if (!username || !mobile) return alert('Please fill all fields.');

            try {
                const res = await fetch('/api/auth/signup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, mobile })
                });
                const data = await res.json();

                if (res.ok) {
                    alert(data.message || 'Signup complete. Check console for temp password.');
                    console.log('Temp Password:', data.tempPassword);
                    renderLoginForm();
                } else {
                    alert(data.message || 'Signup failed.');
                }
            } catch (err) {
                alert('Signup failed.');
                console.error(err);
            }
        });

        document.getElementById('login-link').addEventListener('click', (e) => {
            e.preventDefault();
            renderLoginForm();
        });
    };

    const renderLoginForm = () => {
        clearAuthContainer();

        const form = document.createElement('form');
        form.id = 'login-form';
        form.innerHTML = `
      <h2>Login</h2>
      <p>Enter your username to receive an OTP.</p>

      <label for="username">Username</label>
      <input type="text" id="username" name="username" required>

      <div id="otp-field" style="display: none;">
        <label for="otp">OTP</label>
        <input type="text" id="otp" name="otp" maxlength="6" pattern="\\d{6}">
      </div>

      <button type="submit" id="login-submit-btn">Send OTP</button>
      <p><a href="#" id="signup-link">Don’t have an account? Sign up</a></p>
    `;

        authContainer.appendChild(form);

        const usernameInput = form.username;
        const otpInput = form.otp;
        const otpField = document.getElementById('otp-field');
        const submitBtn = document.getElementById('login-submit-btn');

        let isOtpStep = false;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = usernameInput.value.trim();

            if (!username) return alert('Please enter your username.');

            if (!isOtpStep) {
                try {
                    const res = await fetch('/api/auth/login-start', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ username })
                    });
                    const data = await res.json();

                    if (res.ok) {
                        alert(data.message);
                        console.log('Test OTP:', data.otpForTesting);
                        otpField.style.display = 'block';
                        otpInput.value = data.otpForTesting;
                        submitBtn.textContent = 'Verify & Login';
                        usernameInput.readOnly = true;
                        isOtpStep = true;
                    } else {
                        alert(data.message || 'Error sending OTP.');
                    }
                } catch (err) {
                    alert('Server error.');
                    console.error(err);
                }
            } else {
                const otp = otpInput.value.trim();
                if (!otp) return alert('Please enter your OTP.');

                try {
                    const res = await fetch('/api/auth/login-verify', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ username, otp })
                    });
                    const data = await res.json();

                    if (data.success) {
                        alert('Login successful!');
                        window.location.href = '/view-wips';
                    } else {
                        alert(data.message || 'Invalid OTP.');
                    }
                } catch (err) {
                    alert('Login failed.');
                    console.error(err);
                }
            }
        });

        document.getElementById('signup-link').addEventListener('click', (e) => {
            e.preventDefault();
            renderSignupForm();
        });
    };

    try {
        const res = await fetch('/api/auth/check-session', { method: 'GET' });
        const data = await res.json();

        if (res.ok && data.loggedIn) {
            // Already logged in → redirect
            window.location.href = '/view-wips';
            return;
        }
    } catch (err) {
        console.warn('Session check failed:', err);
    }

    renderLoginForm();
});