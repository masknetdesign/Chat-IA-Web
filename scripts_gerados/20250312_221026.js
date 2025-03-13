'''
Código gerado para: script para uma pagina de login/cadastro em html e css e javascript
'''

document.getElementById('registerForm').addEventListener('submit', async (event) => {
    event.preventDefault();

    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;

    const response = await fetch('/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });

    const result = await response.json();
    document.getElementById('registerMessage').innerText = result.message;
    document.getElementById('registerMessage').style.color = response.ok ? 'green' : 'red';
});

document.getElementById('loginForm').addEventListener('submit', async (event) => {
    event.preventDefault();

    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    const response = await fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });

    const result = await response.json();
    document.getElementById('loginMessage').innerText = result.message;
    document.getElementById('loginMessage').style.color = response.ok ? 'green' : 'red';
});