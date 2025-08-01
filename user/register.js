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

        if (accountType === 'vip用户') {
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
    const response = await fetch('/api/githubToken');
    if (!response.ok) throw new Error('无法获取GitHub Token');
    const data = await response.json();
    return data.token;
}

// 在saveUserData函数中修改错误处理
async function saveUserData(data) {
    try {
        const tempToken = await getGitHubToken();
        const repoPath = 'ziyit-hacker/tas/contents/user/user.txt';
        
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
        console.error('保存错误:', error);
        alert('注册失败: 系统认证错误，请联系管理员获取帮助');
        return false;
    }
}

// 后端API接口示例（Node.js）
const express = require('express');
const app = express();
const GITHUB_TOKEN = process.env.GITHUB_TOKEN; // 从环境变量获取

app.get('/api/githubToken', (req, res) => {
  // 添加身份验证逻辑
  if(!isValidRequest(req)) {
    return res.status(403).json({error: '无权访问'});
  }
  res.json({token: GITHUB_TOKEN});
});