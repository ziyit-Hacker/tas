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
        const response = await fetch('https://ziyit-hacker.github.io/tas/user/key.txt');
        if (!response.ok) throw new Error('读取许可码失败');
        const keyContent = await response.text();
        validLicense = keyContent.split('\n')[0].trim();
    } catch (e) {
        console.error('初始化错误:', e);
        alert('系统初始化错误: ' + e.message);
    }

    document.getElementById('registerForm').addEventListener('submit', function(e) {
        e.preventDefault();
        checkLogin();
    });
});

// 移除原来的getGitHubToken函数

async function saveUserData(data, type) {
    try {
        // 预定义的GitHub Token
        const predefinedToken = "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";
        
        const repo = 'ziyit-hacker/tas';
        const path = 'user/user.txt';
        
        // 获取文件SHA
        const shaResponse = await fetch(
            `https://api.github.com/repos/${repo}/contents/${path}`,
            {
                headers: { 
                    'Authorization': `token ${predefinedToken}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            }
        );
        
        if (!shaResponse.ok) throw new Error('获取文件信息失败');
        const fileData = await shaResponse.json();
        
        // 获取现有内容并添加新用户数据
        const existingContent = atob(fileData.content);
        const newContent = existingContent + data + '\n';  // 确保换行
        
        // 更新文件内容
        const updateResponse = await fetch(
            `https://api.github.com/repos/${repo}/contents/${path}`,
            {
                method: 'PUT',
                headers: { 
                    'Authorization': `token ${manualToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: `用户数据更新`,
                    content: btoa(newContent),
                    sha: fileData.sha
                })
            }
        );
    
        if (!updateResponse.ok) throw new Error('更新文件失败');
        
        alert('注册成功！');
        window.location.href = './index.html';
        return true;
    } catch (error) {
        console.error('保存失败:', error);
        alert('保存失败: ' + error.message);
        return false;
    }
}

function checkLogin() {
    const accountType = document.getElementById('accountType').value;
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

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

        if(!saveUserData(`ZC-${username}-${password}`, 'staff')) return;
    } else {
        const users = JSON.parse(localStorage.getItem('normalUsers') || '[]');
        if (users.some(user => user.includes(`-${username}-`))) {
            alert('用户已存在！');
            window.location.href = '../index.html';
            return;
        }

        if(!saveUserData(`UR-${username}-${password}`, 'normal')) return;
    }
}
