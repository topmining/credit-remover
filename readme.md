OpenEthereumPool Credit Remover
===============================

불필요한 credits 자료를 삭제합니다.  
옵션설정에 따라서 삭제한 credits 자료를 복구할 수 있는 백업파일을 생성합니다.  

### Install NodeJS
    $ curl -sL https://deb.nodesource.com/setup_6.x | sudo -E bash -
    $ sudo apt-get install nodejs

### Copy source file
    $ cd /root
    $ git clone https://github.com/topmining/credit-remover
    $ cd credit-remover
    $ mkdir backup

### Install Dependence
    $ npm install redis
    $ npm install system-sleep
    $ npm install isnumber

### Config
    $ vi config.json
    $
    $   {
    $       "coin": "esn",
    $       "aliveBlocks": 10000,
    $       "redisPool": {
    $           "host": "127.0.0.1",
    $           "port": 6379,
    $           "password": ""
    $       },
    $       "backup": true,
    $       "backupPath": "/root/credit-remover/backup/"
    $   }
    $
    $ coin 코인 식별자를 설정합니다.
    $ redis 계정 정보를 변경합니다.
    $ aliveBlocks 남겨둘 블록수를 지정합니다.
    $ backup 복구할 수 있는 백업파일을 생성
    $ backupPath 백업폴더 지정 (폴더없는 경우 오류남, 미리 생성할것)

### Run
    $ node init.js

### Use crontab
    $ crontab -e
    $ 0 0 * * * node /root/credit-remover/init.js >> /root/credit-remover/remover.log
