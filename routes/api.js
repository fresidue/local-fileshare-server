var bodyParser = require('body-parser');

module.exports = function(app) {

  app.use('/api', bodyParser.json({
    limit: '50mb',
  }));
  app.use(bodyParser.urlencoded({
    extended: true,
    limit: '50mb',
  }));

  app.use('/api/upload', require('./upload')());

  app.use('/api', function(req, res, next) {
    var e = new Error('Not Found');
    e.status = 404;
    next(e);
  });

  app.use('/api', function(err, req, res, next) {
    console.log(err.stack);
    var status = (err.status || 500);
    res.status(status);
    res.json({
      status: status,
      message: err.message,
    });
  });
};
