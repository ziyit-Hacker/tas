(function() {
    const redirectToHmd = () => {
        localStorage.setItem('devToolsOpened', 'HMDuser');
        window.location.href = '../hmd.html';
    };

    // 1. 键盘快捷键检测
    document.addEventListener('keydown', (e) => {
        if (e.key === 'F12' || 
            (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(e.key))) {
            e.preventDefault();
            redirectToHmd();
        }
    });

    // 2. 右键菜单阻止
    document.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        redirectToHmd();
    });

    // 3. 定时检查窗口大小变化
    setInterval(() => {
        const widthDiff = window.outerWidth - window.innerWidth;
        const heightDiff = window.outerHeight - window.innerHeight;
        if (widthDiff > 100 || heightDiff > 100) {
            redirectToHmd();
        }
    }, 1000);

    // 4. 检查开发者工具状态
    const checkDevTools = () => {
        const devtools = /./;
        devtools.toString = function() {
            redirectToHmd();
            return '';
        };
        console.log('%c', devtools);
    };
    checkDevTools();

    // 5. 页面加载时检查本地存储
    if (localStorage.getItem('devToolsOpened') === 'HMDuser') {
        redirectToHmd();
    }

    // 6. 阻止调试函数
    Object.defineProperty(window, 'console', {
        value: new Proxy(console, {
            get(target, prop) {
                if (['log', 'debug', 'info', 'error'].includes(prop)) {
                    return function() {
                        redirectToHmd();
                    };
                }
                return target[prop];
            }
        })
    });
})();
