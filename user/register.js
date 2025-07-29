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

    document.getElementById('registerForm').addEventListener('submit', function (e) {
        e.preventDefault();
        checkLogin();
    });
});

// 移除原来的getGitHubToken函数

// 修改为调用您的后端API
async function saveUserData(data, type) {
    try {
        const response = await fetch('/api/saveUser', {
            method: 'POST',
            body: JSON.stringify({ userData: data })
        });
        // ...处理响应...
    }
}

async function saveUserData(data) {
    try {
        // 这里需要手动输入临时Token（有效期2分钟）
        const tempToken = prompt("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");

        const response = await fetch('https://api.github.com/repos/ziyit-hacker/tas/contents/user.txt', {
            method: 'PUT',
            headers: {
                'Authorization': `token ${tempToken}`,
                'Accept': 'application/vnd.github.v3+json'
            },
            body: JSON.stringify({
                message: '更新用户数据',
                content: btoa(data),
                sha: await getFileSHA() // 需要先获取文件SHA
            })
        });

        if (!response.ok) throw new Error('保存失败');
        return true;
    } catch (error) {
        console.error('保存错误:', error);
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
}
