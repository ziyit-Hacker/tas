/**
 * 注册页面JavaScript文件 - 处理用户注册逻辑
 * 功能包括：表单验证、用户数据保存、VIP许可码验证等
 */

/**
 * 切换VIP许可码输入框的显示状态
 * 当用户选择"vip用户"时显示许可码输入框，选择其他时隐藏并清空输入
 */
function toggleLicense() {
    const accountType = document.getElementById('accountType').value;
    const licenseDiv = document.getElementById('licenseDiv');
    const licenseInput = document.getElementById('license');
    
    // 根据账号类型显示或隐藏许可码输入框
    licenseDiv.style.display = accountType === 'vip用户' ? 'block' : 'none';
    
    // 动态管理required属性，避免浏览器验证错误
    if (accountType === 'vip用户') {
        licenseInput.required = true;
    } else {
        licenseInput.required = false;
        licenseInput.value = ''; // 清空输入框
    }
}

/**
 * 存储有效的VIP许可码列表
 * 从key.txt文件加载，用于验证用户输入的许可码
 */
let validLicenses = [];

/**
 * 页面加载完成后初始化注册功能
 * 加载许可码文件并设置表单提交事件监听器
 */
window.addEventListener('DOMContentLoaded', async () => {
    try {
        // 从服务器加载许可码文件
        const response = await fetch('./key.txt');
        if (!response.ok) throw new Error('读取许可码失败');
        const keyContent = await response.text();
        // 读取所有许可码到数组中，过滤空行
        validLicenses = keyContent.trim().split('\n').filter(Boolean);

        // 获取表单元素并设置提交事件监听器
        const form = document.querySelector('form');
        if (form) {
            form.addEventListener('submit', async function(e) {
                // 阻止表单默认提交行为
                e.preventDefault();
                e.stopPropagation();
                
                // 清除URL中的查询参数，避免重复提交
                if (window.location.search) {
                    window.history.replaceState({}, document.title, window.location.pathname);
                }
                
                try {
                    // 执行注册检查逻辑
                    const success = await checkLogin();
                    // 如果注册成功，跳转到首页
                    if (success) {
                        window.location.replace('../');
                    }
                } catch (error) {
                    // 捕获并显示注册过程中的错误
                    console.error('注册错误:', error);
                    alert('注册失败: ' + error.message);
                }
                
                // 阻止表单默认提交
                return false;
            });
        }
    } catch (e) {
        // 捕获初始化过程中的错误
        console.error('初始化错误:', e);
        alert('系统初始化错误: ' + e.message);
    }
});

/**
 * 加载CryptoJS加密库
 * 返回Promise对象，确保加密库加载完成后再使用
 */
function loadCryptoJS() {
    return Promise.resolve(window.CryptoJS);
}

/**
 * 检查登录/注册信息的主要函数
 * 执行用户输入验证、用户名重复检查、VIP许可码验证等逻辑
 * @returns {Promise<boolean>} 返回注册是否成功的布尔值
 */
async function checkLogin() {
    // 获取表单输入值
    const accountType = document.getElementById('accountType').value;
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const isZTG = document.getElementById('isZTG').value;
    
    // 加载加密库并对密码进行MD5加密
    const CryptoJS = await loadCryptoJS();
    const encryptedPwd = CryptoJS.MD5(password).toString(CryptoJS.enc.Base64);

    try {
        // ========== 输入验证阶段 ==========
        
        // 检查用户名是否为空
        if (!username.trim()) {
            alert('用户名不能为空！');
            return false;
        }
        
        // 检查密码是否为空
        if (!password.trim()) {
            alert('密码不能为空！');
            return false;
        }
        
        // 检查是否选择了ZTG用户类型
        if (!isZTG.trim()) {
            alert('请选择是否为ZTG用户！');
            return false;
        }

        // ========== 用户名重复检查 ==========
        
        // 从服务器加载现有用户列表
        const usersResponse = await fetch('./user.txt');
        const usersText = await usersResponse.text();
        // 将用户数据分割成数组，过滤空行
        const users = usersText.trim().split('\n').filter(Boolean);

        /**
         * 检查用户名是否已存在
         * 用户数据格式：ZC/UR-用户名-密码-isZTG
         * 精确匹配用户名部分（第二个字段）
         */
        const usernameExists = users.some(user => {
            const parts = user.split('-');
            // 用户数据格式：ZC/UR-用户名-密码-isZTG
            return parts.length >= 2 && parts[1] === username;
        });

        // 如果用户名已存在，显示错误信息并返回
        if (usernameExists) {
            document.getElementById('usernameError').style.display = 'block';
            return false;
        }

        // ========== VIP用户许可码验证 ==========
        
        if (accountType === 'vip用户') {
            const license = document.getElementById('license').value.trim();
            // 许可码格式正则：5位十六进制数字，重复5次，用连字符分隔
            const licensePattern = /^[0-9A-Fa-f]{5}(?:-[0-9A-Fa-f]{5}){4}$/;

            // 第一步：验证许可码格式是否正确
            if (!licensePattern.test(license)) {
                alert('许可码格式不正确！');
                return false;
            }
            
            /**
             * 检查许可码是否存在于有效许可码列表中
             * 使用大小写不敏感的比较方式
             */
            const licenseExists = validLicenses.some(validLicense => {
                const trimmedValidLicense = validLicense.trim();
                const trimmedLicense = license.trim();
                const isMatch = trimmedValidLicense.toLowerCase() === trimmedLicense.toLowerCase();
                return isMatch;
            });

            // 如果许可码不存在或已失效，提示用户
            if (!licenseExists) {
                alert('许可码不存在或已失效！');
                return false;
            }
        }

        // ========== 用户数据保存阶段 ==========
        
        /**
         * 构建用户数据字符串
         * 格式：账号类型标识-用户名-加密密码-isZTG标识
         * ZC: VIP用户，UR: 普通用户
         */
        const userData = `${accountType === 'vip用户' ? 'ZC' : 'UR'}-${username}-${encryptedPwd}-${isZTG}`;
        
        // 调用保存用户数据函数
        const saved = await saveUserData(userData);
        // 根据保存结果返回注册状态
        if (saved) {
            return true;
        }
        return false;
    } catch (error) {
        // ========== 错误处理阶段 ==========
        
        // 输出错误信息到控制台
        console.error('注册错误:', error);
        alert('注册失败: ' + error.message);
        
        // 将用户数据复制到剪贴板（备用方案）
        navigator.clipboard.writeText(data);
        
        // 重复输出错误信息（可能是历史遗留代码）
        console.error('注册错误:', error);
        alert('注册失败: ' + error.message);
        navigator.clipboard.writeText(data);
        
        /**
         * 创建自定义错误提示弹窗
         * 当注册失败时显示，提示用户手动发送数据
         */
        const msgDiv = document.createElement('div');
        msgDiv.style.position = 'fixed';
        msgDiv.style.top = '50%';
        msgDiv.style.left = '50%';
        msgDiv.style.transform = 'translate(-50%, -50%)';
        msgDiv.style.backgroundColor = 'white';
        msgDiv.style.padding = '20px';
        msgDiv.style.borderRadius = '8px';
        msgDiv.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
        msgDiv.style.zIndex = '1000';
        msgDiv.style.textAlign = 'center';

        // 创建提示文本
        const msgText = document.createElement('p');
        msgText.textContent = '用户数据已复制到剪贴板\n请将数据发送到3950140506@qq.com';
        msgDiv.appendChild(msgText);

        // 创建确定按钮
        const confirmBtn = document.createElement('button');
        confirmBtn.textContent = '确定';
        confirmBtn.style.marginTop = '15px';
        confirmBtn.onclick = function() {
            // 点击确定后移除弹窗并跳转到当前目录
            document.body.removeChild(msgDiv);
            window.location.href = './';
        };
        msgDiv.appendChild(confirmBtn);

        // 将弹窗添加到页面中
        document.body.appendChild(msgDiv);
        return false;
    }
}

/**
 * 保存用户数据到GitHub仓库
 * 使用GitHub API将用户数据保存到指定的仓库文件中
 * @param {string} data - 要保存的用户数据字符串
 * @returns {Promise<boolean>} 返回保存是否成功的布尔值
 */
async function saveUserData(data) {
    try {
        // 获取GitHub访问令牌
        const tempToken = await getGitHubToken();
        // 目标仓库文件路径
        const repoPath = 'ziyit-hacker/tas/contents/user/user.txt';

        /**
         * 第一步：获取文件的当前信息（包括SHA值）
         * 需要SHA值来更新现有文件
         */
        const getResponse = await fetch(`https://api.github.com/repos/${repoPath}`, {
            headers: {
                'Authorization': `token ${tempToken}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        if (!getResponse.ok) {
            const errorData = await getResponse.json();
            // 如果认证失败，使用备用方案：复制数据到剪贴板
            if (errorData.message.includes('Bad credentials')) {
                navigator.clipboard.writeText(data);
                alert('用户数据已复制到剪贴板\n请将数据发送到3950140506@qq.com');
                return false;
            }
            throw new Error(`获取文件SHA失败: ${errorData.message}`);
        }

        // 解析文件信息
        const fileData = await getResponse.json();

        /**
         * 第二步：更新文件内容
         * 使用PUT方法更新文件，需要提供SHA值以确保原子性更新
         */
        const updateResponse = await fetch(`https://api.github.com/repos/${repoPath}`, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${tempToken}`,
                'Accept': 'application/vnd.github.v3+json'
            },
            body: JSON.stringify({
                message: '自动更新用户数据',
                content: btoa(data), // 将数据转换为Base64编码
                sha: fileData.sha    // 提供SHA值以确保更新正确文件
            })
        });

        // 检查更新是否成功
        if (!updateResponse.ok) {
            const errorData = await updateResponse.json();
            throw new Error(`更新文件失败: ${errorData.message}`);
        }

        // 保存成功，返回true
        return true;
    } catch (error) {
        // ========== 保存失败处理 ==========
        
        // 输出错误信息
        console.error('保存错误:', error);
        
        // 将数据复制到剪贴板作为备用方案
        navigator.clipboard.writeText(data);
        
        // 重复输出错误信息（可能是历史遗留代码）
        console.error('注册错误:', error);
        alert('注册失败: ' + error.message);
        navigator.clipboard.writeText(data);
        
        /**
         * 创建自定义错误提示弹窗
         * 提示用户手动发送数据到指定邮箱
         */
        const msgDiv = document.createElement('div');
        msgDiv.style.position = 'fixed';
        msgDiv.style.top = '50%';
        msgDiv.style.left = '50%';
        msgDiv.style.transform = 'translate(-50%, -50%)';
        msgDiv.style.backgroundColor = 'white';
        msgDiv.style.padding = '20px';
        msgDiv.style.borderRadius = '8px';
        msgDiv.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
        msgDiv.style.zIndex = '1000';
        msgDiv.style.textAlign = 'center';

        // 创建提示文本
        const msgText = document.createElement('p');
        msgText.textContent = '用户数据已复制到剪贴板\n请将数据发送到3950140506@qq.com';
        msgDiv.appendChild(msgText);

        // 创建确定按钮
        const confirmBtn = document.createElement('button');
        confirmBtn.textContent = '确定';
        confirmBtn.style.marginTop = '15px';
        confirmBtn.onclick = function() {
            // 点击确定后移除弹窗并跳转
            document.body.removeChild(msgDiv);
            window.location.href = './';
        };
        msgDiv.appendChild(confirmBtn);

        // 将弹窗添加到页面
        document.body.appendChild(msgDiv);
        return false;
    }
}

/**
 * 获取GitHub访问令牌的函数（需要后端API支持）
 * 从后端API获取GitHub访问令牌，用于GitHub API调用
 * @returns {Promise<string>} 返回GitHub访问令牌
 */
async function getGitHubToken() {
    const response = await fetch('/api/githubToken');
    if (!response.ok) throw new Error('无法获取GitHub Token');
    const data = await response.json();
    return data.token;
}
