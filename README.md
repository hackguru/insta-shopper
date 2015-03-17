

Installing On EC2:

https://github.com/SIB-Colombia/dataportal-explorer/wiki/How-to-install-node-and-mongodb-on-Amazon-EC2
http://iconof.com/blog/how-to-install-setup-node-js-on-amazon-aws-ec2-complete-guide/
http://docs.aws.amazon.com/AWSEC2/latest/UserGuide/AccessingInstancesLinux.html


response from subscription:
{"meta":{"code":200},"data":{"object":"user","object_id":null,"aspect":"media","callback_url":"http:\/\/ec2-54-149-40-205.us-west-2.compute.amazonaws.com\/insta\/post","type":"subscription","id":"16642046"}}



Instalilng PhantomJS

cd /usr/local/share
sudo wget https://bitbucket.org/ariya/phantomjs/downloads/phantomjs-1.9.8-linux-x86_64.tar.bz2
sudo tar xjf phantomjs-1.9.8-linux-x86_64.tar.bz2
sudo ln -s /usr/local/share/phantomjs-1.9.8-linux-x86_64/bin/phantomjs /usr/local/share/phantomjs
sudo ln -s /usr/local/share/phantomjs-1.9.8-linux-x86_64/bin/phantomjs /usr/local/bin/phantomjs
sudo ln -s /usr/local/share/phantomjs-1.9.8-linux-x86_64/bin/phantomjs /usr/bin/phantomjs
