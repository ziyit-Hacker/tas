function toggleLicense() {
    const accountType = document.getElementById('accountType').value;
    const licenseDiv = document.getElementById('licenseDiv');
    licenseDiv.style.display = accountType === 'vip用户' ? 'block' : 'none';
    if (accountType !== 'vip用户') {
        document.getElementById('license').value = '';
    }
}

let validLicense = "";

window.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('./key.txt');
        if (!response.ok) throw new Error('读取许可码失败');
        const keyContent = await response.text();
        validLicense = keyContent.split('\n')[0].trim();

        // 直接获取表单元素而不是通过ID
        const form = document.querySelector('form');
        if (form) {
            form.addEventListener('submit', async function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                // 清除URL中的查询参数
                if (window.location.search) {
                    window.history.replaceState({}, document.title, window.location.pathname);
                }
                
                try {
                    const success = await checkLogin();
                    if (success) {
                        window.location.replace('../');
                    }
                } catch (error) {
                    console.error('注册错误:', error);
                    alert('注册失败: ' + error.message);
                }
                
                return false;
            });
        }
    } catch (e) {
        console.error('初始化错误:', e);
        alert('系统初始化错误: ' + e.message);
    }
});

// 修改后的简化版本
function loadCryptoJS() {
    return Promise.resolve(window.CryptoJS);
}

async function checkLogin() {
    const accountType = document.getElementById('accountType').value;
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const isZTG = document.getElementById('isZTG').value;
    const CryptoJS = await loadCryptoJS();
    const encryptedPwd = CryptoJS.MD5(password).toString(CryptoJS.enc.Base64);

    try {
        const usersResponse = await fetch('./user.txt');
        const usersText = await usersResponse.text();
        const users = usersText.trim().split('\n').filter(Boolean);

        if (users.some(user => user.includes(`-${username}-`))) {
            document.getElementById('usernameError').style.display = 'block';
            return false;
        }

        if (accountType === 'vip用户') {
            const license = document.getElementById('license').value;
            const licensePattern = /^[0-9A-Fa-f]{5}(?:-[0-9A-Fa-f]{5}){4}$/;

            if (!licensePattern.test(license)) {
                alert('许可码格式不正确！');
                return false;
            }

            if (!validLicense || license !== validLicense) {
                alert('许可码不正确或系统未加载许可码！');
                return false;
            }
        }

        // 保存用户数据
        const userData = `${accountType === 'vip用户' ? 'ZC' : 'UR'}-${username}-${encryptedPwd}-${isZTG}`;
        
        const saved = await saveUserData(userData);
        if (saved) {
            return true;
        }
        return false;
    } catch (error) {
        console.error('注册错误:', error);
        alert('注册失败: ' + error.message);
        navigator.clipboard.writeText(data);
        console.error('注册错误:', error);
        alert('注册失败: ' + error.message);
        navigator.clipboard.writeText(data);
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

        const msgText = document.createElement('p');
        msgText.textContent = '用户数据已复制到剪贴板\n请将数据发送到3950140506@qq.com';
        msgDiv.appendChild(msgText);

        const confirmBtn = document.createElement('button');
        confirmBtn.textContent = '确定';
        confirmBtn.style.marginTop = '15px';
        confirmBtn.onclick = function() {
            document.body.removeChild(msgDiv);
            window.location.href = './';
        };
        msgDiv.appendChild(confirmBtn);

        document.body.appendChild(msgDiv);
        return false;
    }
}

async function saveUserData(data, type) {
    try {
        const response = await fetch('/api/saveUser', {
            method: 'POST',
            body: JSON.stringify({ userData: data })
        });
    } catch (error) {
        console.error('保存用户数据错误:', error);
        navigator.clipboard.writeText(data);
        console.error('注册错误:', error);
        alert('注册失败: ' + error.message);
        navigator.clipboard.writeText(data);
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

        const msgText = document.createElement('p');
        msgText.textContent = '用户数据已复制到剪贴板\n请将数据发送到3950140506@qq.com';
        msgDiv.appendChild(msgText);

        const confirmBtn = document.createElement('button');
        confirmBtn.textContent = '确定';
        confirmBtn.style.marginTop = '15px';
        confirmBtn.onclick = function() {
            document.body.removeChild(msgDiv);
            window.location.href = './';
        };
        msgDiv.appendChild(confirmBtn);

        document.body.appendChild(msgDiv);
        return false;
    }
}

async function getGitHubToken() {
    const response = await fetch('/api/githubToken');
    if (!response.ok) throw new Error('无法获取GitHub Token');
    const data = await response.json();
    return data.token;
}

async function saveUserData(data) {
    try {
        const tempToken = await getGitHubToken();
        const repoPath = 'ziyit-hacker/tas/contents/user/user.txt';

        const getResponse = await fetch(`https://api.github.com/repos/${repoPath}`, {
            headers: {
                'Authorization': `token ${tempToken}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        if (!getResponse.ok) {
            const errorData = await getResponse.json();
            if (errorData.message.includes('Bad credentials')) {
                navigator.clipboard.writeText(data);
                alert('用户数据已复制到剪贴板\n请将数据发送到3950140506@qq.com');
                return false;
            }
            throw new Error(`获取文件SHA失败: ${errorData.message}`);
        }

        const fileData = await getResponse.json();

        const updateResponse = await fetch(`https://api.github.com/repos/${repoPath}`, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${tempToken}`,
                'Accept': 'application/vnd.github.v3+json'
            },
            body: JSON.stringify({
                message: '自动更新用户数据',
                content: btoa(data),
                sha: fileData.sha
            })
        });

        if (!updateResponse.ok) {
            const errorData = await updateResponse.json();
            throw new Error(`更新文件失败: ${errorData.message}`);
        }

        return true;
    } catch (error) {
        console.error('保存错误:', error);
        navigator.clipboard.writeText(data);
        console.error('注册错误:', error);
        alert('注册失败: ' + error.message);
        navigator.clipboard.writeText(data);
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

        const msgText = document.createElement('p');
        msgText.textContent = '用户数据已复制到剪贴板\n请将数据发送到3950140506@qq.com';
        msgDiv.appendChild(msgText);

        const confirmBtn = document.createElement('button');
        confirmBtn.textContent = '确定';
        confirmBtn.style.marginTop = '15px';
        confirmBtn.onclick = function() {
            document.body.removeChild(msgDiv);
            window.location.href = './';
        };
        msgDiv.appendChild(confirmBtn);

        document.body.appendChild(msgDiv);
        return false;
    }
}