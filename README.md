JavaScript FITS files reader

26 July 2011

Problem when opening the html file locally on Chrome. Chrome doesn't allow local html pages to access local files. I read on StackOverflow that I should run
Chrome with the flag below

--allow-file-access-from-files

27 July 2011

On MacOS X Lion and nginx 1.0.5. I had to configure with the flags below:

./configure --with-cc-opt="-Wno-deprecated-declarations"

Running nginx with local configuration file

nginx -t -c ./nginx.conf

Stop nginx

nginx -s stop

  or

kill -HUP `cat /usr/local/logs/nginx.pid`
