(function() {
    // 1. 键盘快捷键检测 - 直接阻止不跳转
    document.addEventListener('keydown', (e) => {
        if (e.key === 'F12' || 
            (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(e.key))) {
            e.preventDefault();
            return false;
        }
    });

    // 2. 右键菜单阻止 - 直接阻止不跳转
    document.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        return false;
    });

    // 3. 检查开发者工具状态 - 直接阻止不跳转
    const devtools = /./;
    devtools.toString = function() {
        return '';
    };
    console.log('%c', devtools);

    // 4. 阻止调试函数
    Object.defineProperty(window, 'console', {
        value: new Proxy(console, {
            get(target, prop) {
                if (['log', 'debug', 'info', 'error'].includes(prop)) {
                    return function() {};
                }
                return target[prop];
            }
        })
    });
})();
