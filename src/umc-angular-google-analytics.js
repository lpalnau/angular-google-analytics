/* global angular, console */

angular.module('umc-angular-google-analytics', [])
    .provider('Analytics', function() {
        'use strict';
        var created = false,
            trackRoutes = true,
            accountId,
            trackPrefix = '',
            domainName,
            filename = 'analytics.js',
            pageEvent = '$routeChangeSuccess';
            trackEcommerce = false,
            ecommerceLoaded = false;

        this._logs = [];

        // config methods
        this.setAccount = function(id) {
          accountId = id;
          return true;
        };
        this.trackPages = function(doTrack) {
          trackRoutes = doTrack;
          return true;
        };
        this.trackPrefix = function(prefix) {
          trackPrefix = prefix;
          return true;
        };

        this.setDomainName = function(domain) {
          domainName = domain;
          return true;
        };
        
        this.setFilename = function(name) {
          filename = name;
          return true;
        };

        this.setPageEvent = function(name) {
          pageEvent = name;
          return true;
        }

        this.trackEcommerce = function(doTrack) {
          trackEcommerce = doTrack;
          return true;
        };


        // public service
        this.$get = ['$document', '$rootScope', '$location', '$window', function($document, $rootScope, $location, $window) {
          // private methods
          function _createScriptTag() {
            //require accountId
            if (!accountId) return;

            //initialize the window object __gaTracker
            $window.GoogleAnalyticsObject = '__gaTracker';
            if(angular.isUndefined($window.__gaTracker)) {
                $window.__gaTracker = function() {
                    if(angular.isUndefined($window.__gaTracker.q)) {
                        $window.__gaTracker.q = [];
                    }
                    $window.__gaTracker.q.push(arguments);
                };
                $window.__gaTracker.l=1*new Date();
            }
            var opts = {};
            if(domainName) {
                opts.cookieDomain = domainName;
            }

            $window.__gaTracker('create', accountId);

            if (trackEcommerce && !ecommerceLoaded) {
                $window.__gaTracker('require', 'ecommerce', 'ecommerce.js');
                ecommerceLoaded = true;
            }

            if (trackRoutes) this._trackPage($location.path(), $rootScope.pageTitle);

            // inject the google analytics tag
            (function() {
              var gaTag = $document[0].createElement('script');
              gaTag.type = 'text/javascript';
              gaTag.async = true;
              gaTag.src = '//www.google-analytics.com/' + filename;
              var s = $document[0].getElementsByTagName('script')[0];
              s.parentNode.insertBefore(gaTag, s);
            })();
            created = true;
          }
          // for testing
          this._log = function() {
            this._logs.push(arguments);
          };

          /**
            * Track Pageview
            * https://developers.google.com/analytics/devguides/collection/analyticsjs/field-reference#hit
            * @param url (optional, if not specified $location.path() will be used, and this gets the trackPrefix prefixed onto it)
            * @param title (optional, if not specified $rootScope.pageTitle will be used if defined, else let GA use the document.title property)
            * @private
            */
          this._trackPage = function(url,title) {
              if (angular.isUndefined($window.__gaTracker)) { return; }

              if (angular.isUndefined(url)) { url = $location.path(); }
              var fullUrl = trackPrefix + url;
              if (fullUrl != '' && fullUrl.charAt(0) !== '/') { fullUrl = '/' + fullUrl; } //page should always start with a /
              var opts = { 'page': fullUrl };

              if(angular.isUndefined(title) && angular.isDefined($rootScope.pageTitle)) { title = $rootScope.pageTitle; }
              if(angular.isDefined(title) && title !== '') { opts.title = title; }

              $window.__gaTracker('send','pageview', opts);
              this._log('pageview', arguments);
          };

          /**
            * Track Event
            * https://developers.google.com/analytics/devguides/collection/analyticsjs/field-reference#events
            * @param category
            * @param action
            * @param label
            * @param value
            * @private
            */
          this._trackEvent = function(category, action, label, value) {
              if (angular.isUndefined($window.__gaTracker)) { return; }

              $window.__gaTracker('send','event', {
                  'eventCategory': category,
                  'eventAction': action,
                  'eventLabel': label,
                  'eventValue': value
              });
              this._log('event', arguments);
          };

          /**
           * Add transaction
           * https://developers.google.com/analytics/devguides/collection/analyticsjs/ecommerce#addTrans
           * @param transactionId
           * @param affiliation
           * @param total
           * @param tax
           * @param shipping
           * @private
           * temporarily removing city, state, country as I don't see these in the newer documentation
           */
          this._addTrans = function (transactionId, affiliation, total, tax, shipping) {
            if (angular.isUndefined($window.__gaTracker)) { return; }

            //guard in case ecommerce hasn't been loaded, shouldn't really happen
            if(trackEcommerce && !ecommerceLoaded) {
                $window.__gaTracker('require', 'ecommerce', 'ecommerce.js');
                ecommerceLoaded = true;
            }

            $window.__gaTracker('ecommerce:addTransaction', {
                'id': transactionId,
                'affiliation': affiliation,
                'revenue': total,
                'shipping': shipping,
                'tax': tax
                //'city': city,
                //'state': state,
                //'country': country
            });
            this._log('ecommerce:addTransaction', arguments);
          };

          /**
           * Add item to transaction
           * https://developers.google.com/analytics/devguides/collection/analyticsjs/ecommerce#addItem
           * @param transactionId
           * @param name
           * @param sku
           * @param category
           * @param price
           * @param quantity
           * @private
           */
          this._addItem = function (transactionId, name, sku, category, price, quantity) {
              if (angular.isUndefined($window.__gaTracker)) { return; }

              $window.__gaTracker('ecommerce:addItem', {
                  'id': transactionId,
                  'name': name,
                  'sku': sku,
                  'category': category,
                  'price': price,
                  'quantity': quantity
              });
              this._log('ecommerce:addItem', arguments);
          };

          /**
           * Track transaction
           * https://developers.google.com/analytics/devguides/collection/analyticsjs/ecommerce#sendingData
           * @private
           */
          this._trackTrans = function () {
              if (angular.isUndefined($window.__gaTracker)) { return; }

              $window.__gaTracker('ecommerce:send');
              this._log('ecommerce:send', arguments);
          };

          /**
           * Clear transaction
           * https://developers.google.com/analytics/devguides/collection/analyticsjs/ecommerce#clearingData
           * @private
           */
          this._clearTrans = function () {
              if (angular.isUndefined($window.__gaTracker)) { return; }

              $window.__gaTracker('ecommerce:clear');
              this._log('ecommerce:clear', arguments);
          };


          this._trackSocial = function(network, action, target) {
              if (angular.isUndefined($window.__gaTracker)) { return; }

              $window.__gaTracker('send','social', {
                 'socialNetwork': network,
                 'socialAction': action,
                 'socialTarget': target
              });
              this._log('trackSocial', arguments);
          };

          // --------- initialization steps -----------------------
          // creates the ganalytics tracker
          _createScriptTag();

          var me = this;

          // activates page tracking
          if (trackRoutes) {
              $rootScope.$on(pageEvent, function() {
                  me._trackPage($location.path(), $rootScope.pageTitle);
              });
          }
          // --------- end initialization steps -----------------------


          // the rest of the public interface
          return {
                _logs: me._logs,
                trackPage: function(url, title) {
                    // add a page event
                    me._trackPage(url, title);
                },
                trackEvent: function(category, action, label, value) {
                    // add an action event
                    me._trackEvent(category, action, label, value);
                },
                addTrans: function (transactionId, affiliation, total, tax, shipping) {
                    me._addTrans(transactionId, affiliation, total, tax, shipping);
                },
                addItem: function (transactionId, sku, name, category, price, quantity) {
                    me._addItem(transactionId, name, sku, category, price, quantity);
                },
                trackTrans: function () {
                    me._trackTrans();
                },
                clearTrans: function () {
                    me._clearTrans();
                },
                trackSocial: function(network, action, target) {
                    me._trackSocial(network, action, target);
                },
                ga: function() {
                    if(angular.isDefined($window.__gaTracker)) {
                        $window.__gaTracker(arguments);
                    }
                }
            };
        }];

    });
