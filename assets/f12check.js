(function() {
    document.addEventListener('keydown', (e) => {
        if (e.key === 'F12' || 
            (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(e.key))) {
            e.preventDefault();
            return false;
        }
    });

    document.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        return false;
    });

    const devtools = /./;
    devtools.toString = function() {
        return '';
    };
    console.log('%c', devtools);
})();
