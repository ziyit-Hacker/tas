// 征信黑名单检查功能
function checkCreditBlacklist() {
    console.log('开始检查征信黑名单...');
    
    // 获取当前登录的用户名
    const currentUser = getCurrentUser();
    console.log('当前用户:', currentUser);
    
    if (!currentUser) {
        console.log('未检测到登录用户，跳过黑名单检查');
        return false;
    }
    
    // 异步加载黑名单文件
    fetch('/zxbl.txt')
        .then(response => {
            console.log('黑名单文件响应状态:', response.status);
            if (!response.ok) {
                throw new Error('黑名单文件加载失败: ' + response.status);
            }
            return response.text();
        })
        .then(data => {
            console.log('黑名单文件内容:', data);
            const lines = data.split('\n');
            let foundInBlacklist = false;
            
            for (const line of lines) {
                if (line.trim() === '') continue;
                
                // 解析格式："用户名  \\  原因"
                const parts = line.split('  \\\\  ');
                console.log('解析行:', line, '分割结果:', parts);
                
                if (parts.length >= 2) {
                    const username = parts[0].trim();
                    const reason = parts[1].trim();
                    
                    console.log('黑名单用户名:', username, '当前用户:', currentUser);
                    
                    if (username === currentUser) {
                        console.log('用户存在于黑名单中，原因:', reason);
                        // 用户存在于黑名单中
                        showCreditWarning(reason);
                        foundInBlacklist = true;
                        return;
                    }
                }
            }
            
            if (!foundInBlacklist) {
                console.log('用户不在黑名单中');
            }
        })
        .catch(error => {
            console.error('加载黑名单文件失败:', error);
        });
}

// 显示征信警告
function showCreditWarning(reason) {
    console.log('显示征信警告，原因:', reason);
    
    // 创建征信警告元素
    const creditWarning = document.createElement('div');
    creditWarning.id = 'credit-warning';
    creditWarning.innerHTML = `
        <div id="credit-badge" style="
            position: fixed;
            bottom: 20px;
            right: 20px;
            background-color: #ff4444;
            color: white;
            padding: 10px 15px;
            border-radius: 5px;
            font-size: 14px;
            font-weight: bold;
            cursor: pointer;
            z-index: 9999;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
            transition: all 0.3s ease;
        ">征信</div>
        <div id="credit-details" style="
            position: fixed;
            bottom: 60px;
            right: 20px;
            background-color: #ff4444;
            color: white;
            padding: 15px;
            border-radius: 5px;
            font-size: 14px;
            max-width: 300px;
            opacity: 0;
            transform: translateY(10px);
            transition: all 0.3s ease;
            z-index: 9998;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
            pointer-events: none;
        ">您存在在征信黑名单中，无法使用大部分功能，原因为：${reason}</div>
    `;
    
    document.body.appendChild(creditWarning);
    
    const creditBadge = document.getElementById('credit-badge');
    const creditDetails = document.getElementById('credit-details');
    
    // 鼠标悬停显示详情（丝滑动画）
    creditBadge.addEventListener('mouseenter', () => {
        creditDetails.style.opacity = '1';
        creditDetails.style.transform = 'translateY(0)';
        creditDetails.style.pointerEvents = 'auto';
    });
    
    creditBadge.addEventListener('mouseleave', () => {
        creditDetails.style.opacity = '0';
        creditDetails.style.transform = 'translateY(10px)';
        creditDetails.style.pointerEvents = 'none';
    });
    
    // 随机删除页面75%的内容（除了征信警告）
    setTimeout(() => {
        removeRandomElements();
    }, 1000);
}

// 随机删除页面元素
function removeRandomElements() {
    console.log('开始删除页面元素...');
    const elementsToRemove = [];
    const allElements = document.body.querySelectorAll('*:not(#credit-warning):not(#credit-warning *)');
    
    console.log('页面元素总数:', allElements.length);
    
    // 计算需要删除的元素数量（25%到75%中随机一个百分比）
    const randomPercentage = 0.25 + Math.random() * 0.5; // 生成25%到75%之间的随机数
    const removeCount = Math.floor(allElements.length * randomPercentage);
    console.log('随机删除比例:', (randomPercentage * 100).toFixed(1) + '%', '需要删除的元素数量:', removeCount);
    
    // 随机选择要删除的元素
    while (elementsToRemove.length < removeCount && allElements.length > 0) {
        const randomIndex = Math.floor(Math.random() * allElements.length);
        const element = allElements[randomIndex];
        
        // 确保不重复选择且不是征信警告相关元素
        if (!elementsToRemove.includes(element) && 
            !element.closest('#credit-warning')) {
            elementsToRemove.push(element);
        }
    }
    
    console.log('即将删除的元素数量:', elementsToRemove.length);
    
    // 删除选中的元素
    elementsToRemove.forEach(element => {
        if (element.parentNode) {
            element.parentNode.removeChild(element);
        }
    });
    
    console.log('元素删除完成');
}

// 获取当前用户（根据用户数据格式解析）
function getCurrentUser() {
    console.log('开始获取当前用户...');
    
    // 检查URL参数中的用户信息
    const urlParams = new URLSearchParams(window.location.search);
    const urlUser = urlParams.get('user');
    if (urlUser) {
        console.log('从URL参数获取用户:', urlUser);
        return urlUser;
    }
    
    // 从cookie获取当前用户信息（优先），然后回退到localStorage
    const userData = getCookie('authToken') || localStorage.getItem('authToken');
    console.log('从cookie/localStorage获取的用户数据:', userData);
    
    if (!userData) {
        console.log('未找到任何用户数据');
        return null;
    }
    
    try {
        // 解析用户数据格式："用户类型-用户名-加密后的密码-是否为ZTG用户"
        const parts = userData.split('-');
        console.log('解析用户数据部分:', parts);
        
        if (parts.length >= 2) {
            // 返回用户名（第二部分）
            const username = parts[1];
            console.log('解析出的用户名:', username);
            return username;
        }
    } catch (error) {
        console.error('解析用户数据失败:', error);
    }
    
    console.log('用户数据解析失败，返回原始数据:', userData);
    return userData; // 如果解析失败，返回原始数据
}

// 获取cookie值的辅助函数
function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return decodeURIComponent(parts.pop().split(';').shift());
    return null;
}

// 页面加载完成后检查黑名单
document.addEventListener('DOMContentLoaded', function() {
    console.log('页面加载完成，开始检查征信黑名单');
    checkCreditBlacklist();
});

// 添加手动检查函数，用于调试
window.manualCheckBlacklist = function() {
    console.log('手动触发征信检查');
    checkCreditBlacklist();
};