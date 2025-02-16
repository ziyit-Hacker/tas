import itertools as its
import datetime

start = datetime.datetime.now()
for t in range(1,16):
    words = '0123456789qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM'
    r = its.product(words, repeat=t)
    dic = open(r"Ccsdnwifi.txt", 'a')
    for i in r:
        dic.write(''.join(i))
        dic.write(''.join('\n'))
        print(i)

dic.close()
print('密码本生成好了')
end = datetime.datetime.now()
print("生成密码本一共用了多长时间：{}".format(end - start))
