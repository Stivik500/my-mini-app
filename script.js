// --- 1. ИНИЦИАЛИЗАЦИЯ И ПЕРЕМЕННЫЕ ---
const tg = window.Telegram.WebApp;
tg.expand(); // Раскрыть на весь экран

// Элементы DOM
const screens = {
    splash: document.getElementById('splash-screen'),
    auth: document.getElementById('auth-screen'),
    main: document.getElementById('main-app')
};

const views = {
    profile: document.getElementById('profile-view')
};

const modal = document.getElementById('add-product-modal');

// Данные пользователя (загружаем из памяти или создаем новые)
let user = JSON.parse(localStorage.getItem('ds_user')) || {
    email: '',
    password: '',
    name: '',
    avatar: null, // Здесь будет base64 или URL
    cart: []
};

// Список товаров (загружаем из памяти или дефолтные)
let products = JSON.parse(localStorage.getItem('ds_products')) || [
    { id: 1, name: "Кукла Barbie Style", price: 1500, rating: 4.8, img: "https://cdn-icons-png.flaticon.com/512/3081/3081840.png", discount: 10 },
    { id: 2, name: "Домик для кукол", price: 4500, rating: 4.9, img: "https://cdn-icons-png.flaticon.com/512/2913/2913524.png", discount: 5 },
    { id: 3, name: "Набор одежды", price: 800, rating: 4.5, img: "https://cdn-icons-png.flaticon.com/512/2633/2633576.png", discount: 0 }
];

let longPressTimer;
const LONG_PRESS_DURATION = 4000; // 4 секунды

// --- 2. ЗАПУСК ПРИЛОЖЕНИЯ ---
window.addEventListener('load', () => {
    // Имитация загрузки (2 секунды)
    setTimeout(() => {
        showScreen('auth');
        
        // Если пользователь уже зарегистрирован, сразу пускаем в магазин
        if (user.name && user.email) {
            initMainApp();
        }
    }, 2000);
});

// Переключение экранов (Splash -> Auth -> Main)function showScreen(screenName) {
    Object.values(screens).forEach(s => {
        s.classList.remove('active');
        setTimeout(() => {
            if (!s.classList.contains('active')) s.classList.add('hidden');
        }, 300);
    });

    const target = screens[screenName];
    target.classList.remove('hidden');
    // Небольшая задержка для плавности CSS transition
    setTimeout(() => target.classList.add('active'), 50);
}

// --- 3. ЛОГИКА РЕГИСТРАЦИИ ---
function goToStep(step) {
    const steps = ['email', 'password', 'profile'];
    
    // Сохраняем введенные данные
    if (step === 'password') {
        const email = document.getElementById('email-input').value;
        if (!email) return alert('Введите почту!');
        user.email = email;
    }
    if (step === 'profile') {
        const pass = document.getElementById('password-input').value;
        if (!pass) return alert('Введите пароль!');
        user.password = pass;
    }

    // Переключаем видимость шагов
    steps.forEach(s => {
        const el = document.getElementById(`step-${s}`);
        if (s === step) {
            el.classList.remove('hidden');
            setTimeout(() => el.style.opacity = 1, 50);
        } else {
            el.style.opacity = 0;
            setTimeout(() => el.classList.add('hidden'), 300);
        }
    });
}

function finishAuth() {
    const name = document.getElementById('name-input').value;
    if (!name) return alert('Введите имя!');
    
    user.name = name;
    saveUser();
        // Переход в главное приложение
    showScreen('main');
    initMainApp();
}

function saveUser() {
    localStorage.setItem('ds_user', JSON.stringify(user));
}

// --- 4. ГЛАВНОЕ ПРИЛОЖЕНИЕ ---
function initMainApp() {
    renderProducts();
    updateCartCount();
    setupProfileLongPress();
    
    // Заполняем профиль данными
    document.getElementById('profile-name-display').textContent = user.name;
    document.getElementById('profile-email-display').textContent = user.email;
    
    if (user.avatar) {
        const avEl = document.getElementById('profile-avatar-display');
        avEl.innerHTML = `<img src="${user.avatar}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
    }
}

// Отрисовка товаров
function renderProducts() {
    const container = document.getElementById('products-container');
    container.innerHTML = '';

    products.forEach(prod => {
        const oldPrice = prod.discount ? Math.round(prod.price * (1 + prod.discount/100)) : 0;
        
        const card = document.createElement('div');
        card.className = 'product-card';
        card.onclick = () => openProductDetails(prod); // Можно добавить детали позже
        
        card.innerHTML = `
            <img src="${prod.img}" class="product-img" alt="${prod.name}">
            <div class="product-info">
                <div class="price-row">
                    <span class="price">${prod.price} ₽</span>
                    ${oldPrice ? `<span class="old-price">${oldPrice} ₽</span>` : ''}
                </div>
                <div class="prod-name">${prod.name}</div>
                <div class="rating">⭐ ${prod.rating}</div>
                <button class="add-btn-small" onclick="addToCart(${prod.id}, event)">В корзину</button>
            </div>
        `;
        container.appendChild(card);    });
}

// Корзина
function addToCart(id, event) {
    event.stopPropagation(); // Чтобы не открывался товар
    const product = products.find(p => p.id === id);
    user.cart.push(product);
    saveUser();
    updateCartCount();
    
    // Анимация кнопки (визуальный отклик)
    const btn = event.target;
    const originalText = btn.innerText;
    btn.innerText = "✓";
    btn.style.background = "#4caf50";
    setTimeout(() => {
        btn.innerText = originalText;
        btn.style.background = "";
    }, 1000);
    
    tg.HapticFeedback.notificationOccurred('success');
}

function updateCartCount() {
    const count = user.cart.length;
    const badge = document.getElementById('cart-count');
    badge.innerText = count;
    badge.style.display = count > 0 ? 'block' : 'none';
}

// Навигация по табам
function switchTab(tab) {
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    event.currentTarget.classList.add('active');
    
    if (tab === 'profile') {
        openView('profile');
    } else if (tab === 'home') {
        // Просто остаемся на главной
    } else if (tab === 'cart') {
        alert('Корзина: ' + user.cart.length + ' товаров. (Функция в разработке)');
    }
}

// Открытие/Закрытие полных экранов (Профиль)
function openView(viewName) {
    views[viewName].classList.remove('hidden');
    setTimeout(() => views[viewName].classList.add('active'), 10);
}
function closeView(viewName) {
    views[viewName].classList.remove('active');
    setTimeout(() => views[viewName].classList.add('hidden'), 300);
}

// --- 5. СЕКРЕТНОЕ МЕНЮ (ДОЛГОЕ НАЖАТИЕ) ---
function setupProfileLongPress() {
    const avatarTrigger = document.getElementById('profile-avatar-display');
    
    // Начало нажатия
    const startPress = (e) => {
        e.preventDefault(); // Чтобы не было зума или выделения
        tg.HapticFeedback.selectionChanged(); // Вибрация при начале
        
        longPressTimer = setTimeout(() => {
            // Если держим 4 секунды
            tg.HapticFeedback.notificationOccurred('success'); // Сильная вибрация
            openModal();
        }, LONG_PRESS_DURATION);
    };

    // Конец нажатия (отпустили раньше времени)
    const endPress = () => {
        clearTimeout(longPressTimer);
    };

    // Поддержка и мыши, и тача
    avatarTrigger.addEventListener('touchstart', startPress, {passive: false});
    avatarTrigger.addEventListener('touchend', endPress);
    avatarTrigger.addEventListener('mousedown', startPress);
    avatarTrigger.addEventListener('mouseup', endPress);
    avatarTrigger.addEventListener('mouseleave', endPress);
}

// --- 6. ДОБАВЛЕНИЕ ТОВАРА (ADMIN) ---
function openModal() {
    modal.classList.remove('hidden');
    setTimeout(() => modal.classList.add('active'), 10);
}

function closeModal() {
    modal.classList.remove('active');
    setTimeout(() => modal.classList.add('hidden'), 300);
}

function submitNewProduct() {
    const name = document.getElementById('new-prod-name').value;
    const price = parseInt(document.getElementById('new-prod-price').value);
    const fileInput = document.getElementById('new-prod-files');    
    if (!name || !price) return alert('Заполните название и цену!');
    
    // Логика отправки боту
    // 1. Отправляем текстовые данные через sendData
    const data = {
        action: 'start_add_product',
        name: name,
        price: price
    };
    
    tg.sendData(JSON.stringify(data));
    
    // 2. Закрываем модалку и говорим пользователю отправить фото
    closeModal();
    alert('✅ Данные отправлены боту!\n\nТеперь вернитесь в чат с ботом и отправьте ему фотографию этого товара следующим сообщением.');
    
    // Очищаем поля
    document.getElementById('new-prod-name').value = '';
    document.getElementById('new-prod-price').value = '';
    fileInput.value = '';
}

// Обработка ответа от бота (если нужно обновить список товаров после добавления)
tg.onEvent('mainButtonClicked', function(){
    // Можно использовать главную кнопку телеграма для чего-то
});

// Вспомогательная функция для открытия деталей товара (заглушка)
function openProductDetails(prod) {
    // Пока просто алерт, можно сделать отдельный экран
    // tg.showPopup({title: prod.name, message: `Цена: ${prod.price}`});
}

// Поиск (фильтрация на лету)
document.getElementById('search-input').addEventListener('input', (e) => {
    const val = e.target.value.toLowerCase();
    const cards = document.querySelectorAll('.product-card');
    
    cards.forEach(card => {
        const name = card.querySelector('.prod-name').innerText.toLowerCase();
        if (name.includes(val)) {
            card.style.display = 'flex';
        } else {
            card.style.display = 'none';
        }
    });
});
