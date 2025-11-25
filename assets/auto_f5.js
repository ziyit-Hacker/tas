/**
 * 自动刷新功能
 * 当用户1.5分钟（90秒）没有操作时自动刷新网页
 * window.autoRefresh.disable();禁止自动刷新
 * window.autoRefresh.enable();启用自动刷新
 * window.autoRefresh.isEnabled;检查自动刷新是否启用
 * 返回值：true表示启用，false表示禁用
 * window.autoRefresh.setTimeout(毫秒);设置新的超时时间
 */

class AutoRefresh {
    constructor() {
        this.timeoutDuration = 90000; // 1.5分钟 = 90秒
        this.timeoutId = null;
        this.isEnabled = true;
        
        this.init();
    }
    
    // 初始化自动刷新功能
    init() {
        // 重置计时器
        this.resetTimer();
        
        // 监听用户操作事件
        this.setupEventListeners();
        
        // 页面可见性变化监听
        this.setupVisibilityListener();
        
        console.log('自动刷新功能已启用，1.5分钟无操作将自动刷新');
    }
    
    // 设置事件监听器
    setupEventListeners() {
        // 鼠标事件
        document.addEventListener('mousedown', () => this.resetTimer());
        document.addEventListener('mousemove', () => this.resetTimer());
        document.addEventListener('mouseup', () => this.resetTimer());
        document.addEventListener('click', () => this.resetTimer());
        document.addEventListener('dblclick', () => this.resetTimer());
        document.addEventListener('contextmenu', () => this.resetTimer());
        
        // 键盘事件
        document.addEventListener('keydown', () => this.resetTimer());
        document.addEventListener('keyup', () => this.resetTimer());
        document.addEventListener('keypress', () => this.resetTimer());
        
        // 触摸事件（移动设备）
        document.addEventListener('touchstart', () => this.resetTimer());
        document.addEventListener('touchmove', () => this.resetTimer());
        document.addEventListener('touchend', () => this.resetTimer());
        
        // 滚动事件
        document.addEventListener('scroll', () => this.resetTimer());
        window.addEventListener('scroll', () => this.resetTimer());
        
        // 窗口事件
        window.addEventListener('resize', () => this.resetTimer());
        window.addEventListener('focus', () => this.resetTimer());
    }
    
    // 设置页面可见性监听
    setupVisibilityListener() {
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                // 页面不可见时暂停计时
                this.pauseTimer();
            } else {
                // 页面可见时恢复计时
                this.resumeTimer();
            }
        });
    }
    
    // 重置计时器
    resetTimer() {
        if (!this.isEnabled) return;
        
        // 清除现有计时器
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
        }
        
        // 设置新的计时器
        this.timeoutId = setTimeout(() => {
            this.refreshPage();
        }, this.timeoutDuration);
    }
    
    // 暂停计时器
    pauseTimer() {
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }
    }
    
    // 恢复计时器
    resumeTimer() {
        if (!this.timeoutId && this.isEnabled) {
            this.resetTimer();
        }
    }
    
    // 刷新页面
    refreshPage() {
        console.log('检测到1.5分钟无操作，正在刷新页面...');
        
        // 显示刷新提示（可选）
        this.showRefreshNotification();
        
        // 延迟一小段时间后刷新，让用户看到提示
        setTimeout(() => {
            window.location.reload();
        }, 1000);
    }
    
    // 显示刷新提示
    showRefreshNotification() {
        // 创建提示元素
        const notification = document.createElement('div');
        notification.id = 'auto-refresh-notification';
        notification.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 20px 30px;
            border-radius: 10px;
            font-size: 16px;
            z-index: 10000;
            text-align: center;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        `;
        notification.innerHTML = `
            <div style="margin-bottom: 10px;">🔄 即将自动刷新页面</div>
            <div style="font-size: 14px; opacity: 0.8;">1.5分钟无操作，页面将在1秒后刷新</div>
        `;
        
        document.body.appendChild(notification);
        
        // 1秒后移除提示
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 1000);
    }
    
    // 启用自动刷新
    enable() {
        this.isEnabled = true;
        this.resetTimer();
        console.log('自动刷新功能已启用');
    }
    
    // 禁用自动刷新
    disable() {
        this.isEnabled = false;
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }
        console.log('自动刷新功能已禁用');
    }
    
    // 设置新的超时时间（毫秒）
    setTimeout(duration) {
        this.timeoutDuration = duration;
        this.resetTimer();
        console.log(`自动刷新时间已设置为 ${duration / 1000} 秒`);
    }
    
    // 获取剩余时间（毫秒）
    getRemainingTime() {
        // 由于setTimeout无法获取剩余时间，这里返回估算值
        return this.timeoutDuration;
    }
}

// 创建全局自动刷新实例
window.autoRefresh = new AutoRefresh();

// 导出供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AutoRefresh;
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('window.autoRefresh.disable(); 禁止自动刷新');
    console.log('window.autoRefresh.enable(); 启用自动刷新');
    console.log('window.autoRefresh.isEnabled; 检查自动刷新是否启用');
    console.log('window.autoRefresh.setTimeout(毫秒); 设置新的超时时间');
});
