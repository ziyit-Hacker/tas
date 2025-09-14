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

        const usersResponse = await fetch('./user.txt');
        if (!usersResponse.ok) throw new Error('读取用户数据失败');
    } catch (e) {
        console.error('初始化错误:', e);
        alert('系统初始化错误: ' + e.message);
    }

    document.getElementById('registerForm').addEventListener('submit', async function (e) {
        e.preventDefault();
        await checkLogin();
    });
});

async function loadCryptoJS() {
  const { default: CryptoJS } = await import('https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js');
  return CryptoJS;
}

async function checkLogin() {
    const accountType = document.getElementById('accountType').value;
    const username = document.getElementById('username').value;
    const encryptedPwd = CryptoJS.MD5(password).toString(CryptoJS.enc.Base64);
    
    // 密码加密
    const CryptoJS = await loadCryptoJS();

    try {
        const usersResponse = await fetch('./user.txt');
        const usersText = await usersResponse.text();
        const users = usersText.trim().split('\n').filter(Boolean);

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
                window.location.href = '../';
                return;
            }

            if (!saveUserData(`ZC-${username}-${encryptedPwd}`, 'staff')) return;
        } else {
            const users = JSON.parse(localStorage.getItem('normalUsers') || '[]');
            if (users.some(user => user.includes(`-${username}-`))) {
                alert('用户已存在！');
                window.location.href = '../';
                return;
            }

            if (!saveUserData(`UR-${username}-${encryptedPwd}`, 'normal')) return;
        }
    } catch (error) {
        console.error('注册错误:', error);
        alert('注册失败: ' + error.message);
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
        alert('用户数据已复制到剪贴板\n请将数据发送到3950140506@qq.com');
        return false;
    }
}
