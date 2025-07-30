function toggleLicense() {
    const accountType = document.getElementById('accountType').value;
    const licenseDiv = document.getElementById('licenseDiv');
    licenseDiv.style.display = accountType === 'ziyit工作人员' ? 'block' : 'none';
    if (accountType !== 'ziyit工作人员') {
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
        
        // 预加载用户数据
        const usersResponse = await fetch('./user.txt');
        if (!usersResponse.ok) throw new Error('读取用户数据失败');
    } catch (e) {
        console.error('初始化错误:', e);
        alert('系统初始化错误: ' + e.message);
    }

    document.getElementById('registerForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        await checkLogin();
    });
});

async function checkLogin() {
    const accountType = document.getElementById('accountType').value;
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        // 从user.txt读取现有用户
        const usersResponse = await fetch('./user.txt');
        const usersText = await usersResponse.text();
        const users = usersText.trim().split('\n').filter(Boolean);

        // 检查用户名是否已存在
        if (users.some(user => user.includes(`-${username}-`))) {
            alert('该用户名已被注册！');
            return;
        }

        if (accountType === 'ziyit工作人员') {
            const license = document.getElementById('license').value;
            const licensePattern = /^[0-9A-Fa-f]{5}(?:-[0-9A-Fa-f]{5}){4}$/;

            if (!licensePattern.test(license)) {
                alert('许可码格式不正确！');
                return;
            }

            if (!validLicense || license !== validLicense) {
                alert('许可码不正确或系统未加载许可码！');
                window.location.href = '../index.html';
                return;
            }

            if (!saveUserData(`ZC-${username}-${password}`, 'staff')) return;
        } else {
            const users = JSON.parse(localStorage.getItem('normalUsers') || '[]');
            if (users.some(user => user.includes(`-${username}-`))) {
                alert('用户已存在！');
                window.location.href = '../index.html';
                return;
            }

            if (!saveUserData(`UR-${username}-${password}`, 'normal')) return;
        }
    } catch (error) {
        console.error('注册错误:', error);
        alert('注册失败: ' + error.message);
    }
}

// 移除原来的getGitHubToken函数

// 修改为调用您的后端API
async function saveUserData(data, type) {
    try {
        const response = await fetch('/api/saveUser', {
            method: 'POST',
            body: JSON.stringify({ userData: data })
        });
        // ...处理响应...
    } catch (error) {
        console.error('保存用户数据错误:', error);
        return false;
    }
}

async function getGitHubToken() {
    try {
        // 尝试从多个可能的API端点获取token
        const apiEndpoints = [
            '/api/getGitHubToken',
            '/api/github/token',
            '/token',
            'https://your-backend-server.com/api/token' // 添加远程API端点
        ];
        
        for (const endpoint of apiEndpoints) {
            try {
                const response = await fetch(endpoint);
                if (response.ok) {
                    const data = await response.json();
                    if (data?.token) {
                        return data.token;
                    }
                }
            } catch (error) {
                console.warn(`尝试从${endpoint}获取token失败:`, error);
            }
        }
        
        // 所有API端点都失败时，使用开发token
        console.warn('所有API端点都不可用，使用开发token');
        return "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"; // 替换为有效token
        
    } catch (error) {
        console.error('获取GitHub Token最终错误:', error);
        throw error;
    }
}

async function saveUserData(data) {
    try {
        const tempToken = await getGitHubToken();
        const repoPath = 'ziyit-hacker/tas/contents/user/user.txt'; // 注意添加了contents路径
        
        // 1. 获取文件当前SHA值
        const getResponse = await fetch(`https://api.github.com/repos/${repoPath}`, {
            headers: {
                'Authorization': `token ${tempToken}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        if (!getResponse.ok) {
            const errorData = await getResponse.json();
            if(errorData.message.includes('Bad credentials')) {
                alert('认证失败，请刷新页面重试');
                return false;
            }
            throw new Error(`获取文件SHA失败: ${errorData.message}`);
        }
        
        const fileData = await getResponse.json();
        
        // 2. 更新文件内容
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
        console.error('保存错误详情:', {
            error: error.message,
            timestamp: new Date().toISOString(),
            data: data
        });
        alert('保存失败，请检查网络或联系管理员');
        return false;
    }
}
