(function () {
    var params = new URLSearchParams(window.location.search);
    var token = params.get('token');

    var formState = document.getElementById('formState');
    var successState = document.getElementById('successState');
    var invalidState = document.getElementById('invalidState');
    var formError = document.getElementById('formError');
    var form = document.getElementById('resetForm');
    var submitBtn = document.getElementById('submitBtn');

    function showState(el) {
        [formState, successState, invalidState].forEach(function (node) {
            node.classList.remove('visible');
        });
        el.classList.add('visible');
    }

    function showError(message) {
        formError.textContent = message;
        formError.classList.add('visible');
    }

    function clearError() {
        formError.textContent = '';
        formError.classList.remove('visible');
    }

    if (!token) {
        showState(invalidState);
        return;
    }

    form.addEventListener('submit', function (event) {
        event.preventDefault();
        clearError();

        var newPassword = document.getElementById('newPassword').value;
        var confirmPassword =
            document.getElementById('confirmPassword').value;

        if (newPassword.length < 8) {
            showError('Password must be at least 8 characters.');
            return;
        }
        if (newPassword !== confirmPassword) {
            showError('Passwords do not match.');
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Resetting...';

        fetch('/auth/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: token, newPassword: newPassword }),
        })
            .then(function (response) {
                if (response.ok) {
                    showState(successState);
                    return;
                }
                return response.json().then(function (body) {
                    var message =
                        (body &&
                            (body.message ||
                                (Array.isArray(body.message) && body.message[0]))) ||
                        'This reset link is invalid or has expired. Please request a new one.';
                    throw new Error(Array.isArray(message) ? message[0] : message);
                });
            })
            .catch(function (err) {
                showError(
                    err.message || 'Something went wrong. Please try again.',
                );
            })
            .finally(function () {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Reset Password';
            });
    });
})();