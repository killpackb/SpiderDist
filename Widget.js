
define(['dojo/_base/declare',
        'jimu/BaseWidget',
        'esri/layers/GraphicsLayer',
        'esri/tasks/query',
        'esri/geometry/webMercatorUtils',
        'esri/tasks/QueryTask',
        'dojo',
        'dojo/_base/lang',
        'dojo/on',
        'esri/geometry/Point',
        'esri/symbols/SimpleMarkerSymbol',
        'esri/symbols/CartographicLineSymbol',
        'esri/symbols/Font',
        'esri/geometry/Polyline',
        'esri/graphic',
        'esri/Color',
        'esri/symbols/TextSymbol',
        'dojo/number'
  ],
function(declare,
        BaseWidget,
        GraphicsLayer,
        Query,
        webMercatorUtils,
        QueryTask,
        dojo,
        lang,
        on,
        Point,
        SimpleMarkerSymbol,
        CartographicLineSymbol,
        Font,
        Polyline,
        Graphic,
        Color,
        TextSymbol,
        number) {

  return declare([BaseWidget], {
      baseClass: 'jimu-widget-SpiderDist',
      _qT: null,
      _spiderG: null,
      _towers: null,
      _context: null,
      _len:null,
      _closed:false,

    postCreate: function() {
      this.inherited(arguments);
      this.own(on(this.map, 'mouse-move', lang.hitch(this, this.onMouseMove)));
    },

    startup: function() {
        this.inherited(arguments);
        //console.log(this.config.labelColor);
        this._qT = new QueryTask(this.config.pointLayer[0].url);
        var q = new Query();
        q.spatialRelationship = Query.SPATIAL_REL_INTERSECTS;
        q.outFields = ['*'];
        q.returnGeometry = true;
        q.outSpatialReference = this.map.spatialReference;
        q.where = '1=1';

        this._spiderG = new GraphicsLayer();
        this.map.addLayer(this._spiderG);

        q.geometry = this.map.extent;
        this._qT.execute(q,lang.hitch(this, this._towerQuery));

        //inital spider-like diagram graphics container
        this._context = dojo.byId('legendCanvas').getContext('2d');
        this._towers = [];
    },
    onOpen: function() {
      this._closed=false;
    },
    onClose: function(){
        this._closed=true;
        this._spiderG.clear();
    },
    _towerQuery: function(results){
    
            if (results.features.length > 0) {
                this._towers = [];            
                for (var i = 0; i < results.features.length; i++) {
                    var x = webMercatorUtils.webMercatorToGeographic
                      (results.features[i].geometry).x;
                    var y = webMercatorUtils.webMercatorToGeographic
                      (results.features[i].geometry).y;       
                    this._towers.push({
                        'Obj': results.features[i],
                        'X': x,
                        'Y': y,
                        'id': results.features[i].attributes
                          [this.config.pointLayer[0].fields[0].fieldName]
                    });
                }
            } else {
                this._towers = [];
            }
       
    },

      _scale: function(valueIn, baseMin, baseMax, limitMin, limitMax) {
          return ((limitMax - limitMin) * (valueIn - baseMin) / 
            (baseMax - baseMin)) + limitMin;
      },

      _calcDistanceBetween: function(lat1,lon1,lat2,lon2) {
          var R = 3958.7558657440545; // Radius of earth in Miles 
          var dLat = this._toRad(lat2-lat1);
          var dLon = this._toRad(lon2-lon1);
          var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(this._toRad(lat1)) * Math.cos(this._toRad(lat2)  ) * 
                  Math.sin(dLon/2) * Math.sin(dLon/2); 
          var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
          var d = R * c;
          return d;
      },

      _toRad: function(value){
        return value * Math.PI / 180;
      },
      _findDegreeTwoPoints: function(p1, p2) {

          var lat1 = p1.y;
          var lat2 = p2.y;
          var lon1 = p1.x;
          var lon2 = p2.x;
          var dLon = (lon2 - lon1);

          var y = Math.sin(dLon) * Math.cos(lat2);
          var x = Math.cos(lat1) * Math.sin(lat2) -
              Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

          var brng = Math.atan2(y, x);
          brng = brng * (180 / Math.PI);
          brng = (brng + 360) % 360;
          brng = 360 - brng;
          return brng;
      },
      _findNewPoint: function(x, y, angle, distance) {

          var result = {};
          result.x = Math.cos(angle * (Math.PI / 180)) * distance + x;
          result.y = Math.sin(angle * (Math.PI / 180)) * distance + y;
          return result;

      },
      _processCenters: function(evt) {
 
          var markerSymbol = new SimpleMarkerSymbol();
          markerSymbol.style = SimpleMarkerSymbol.STYLE_CIRCLE;
          var point = new Point(evt.mapPoint.x, evt.mapPoint.y, this.map.spatialReference);
          var point2 = webMercatorUtils.webMercatorToGeographic(point);

          var lat1 = point2.y;
          var lon1 = point2.x;
          var dTowers = [];

          for (var i = 0; i < this._towers.length; i++) {
              var lat2 = this._towers[i].Y;
              var lon2 = this._towers[i].X;
              var d = this._calcDistanceBetween(lat1, lon1, lat2, lon2);

              dTowers.push({
                  'GEO': this._towers[i],
                  'dist': d
              });
          }

          dTowers.sort(function(a, b) {
              return a.dist - b.dist;
          });

          var lineSymbol = new CartographicLineSymbol(
              CartographicLineSymbol.STYLE_SOLID,
              new Color([255, 0, 0]), 4,
              CartographicLineSymbol.CAP_ROUND,
              CartographicLineSymbol.JOIN_MITER, 5
          );
          
          var font = new Font(
              '12pt',
              Font.STYLE_NORMAL,
              Font.VARIANT_NORMAL,
              Font.WEIGHT_BOLD,
              'Helvetica'
          );

          var mPnt = new Point(point2.x, point2.y);
          var pLine1 = new Polyline();
          var pnt1 = new Point(dTowers[0].GEO.X, dTowers[0].GEO.Y);
          pLine1.addPath([mPnt, pnt1]);
          lineSymbol.setColor(new Color([255, 0, 0]));
          var pgra1 = new Graphic(pLine1, lineSymbol);
          this._spiderG.add(pgra1);

          var textSymbol1 = new TextSymbol(
              dTowers[0].GEO.id,
              font,
              new Color(this.config.labelColor)
          );
          this._spiderG.add(new Graphic(pnt1, textSymbol1));

          this._context.beginPath();
          this._context.arc(150, 95, 95, 0, 2 * Math.PI, false);
          this._context.strokeStyle = '#003300';
          this._context.lineWidth = 1;
          this._context.stroke();

          this._len = 70;
          var degrees = Math.round(this._findDegreeTwoPoints(point2, pnt1));
          var gg = this._findNewPoint(150, 95, (degrees - 90), this._len);

          this._context.beginPath();
          this._context.moveTo(gg.x, gg.y);
          this._context.lineTo(150, 95);
          this._context.lineWidth = 3;
          this._context.strokeStyle = lineSymbol.color.toHex();
          this._context.fillStyle = '#000000';
          this._context.font = '10pt Calibri';
          this._context.fillText(number.format(dTowers[0].dist), gg.x - 20, gg.y);
          this._context.stroke();

          var pLine2 = new Polyline();
          var pnt2 = new Point(dTowers[1].GEO.X, dTowers[1].GEO.Y);
          pLine2.addPath([mPnt, pnt2]);
          lineSymbol.setColor(new Color([0, 255, 0]));
          var pgra2 = new Graphic(pLine2, lineSymbol);
          this._spiderG.add(pgra2);

          var textSymbol2 = new TextSymbol(
              dTowers[1].GEO.id,
              font,
              new Color(this.config.labelColor)
          );
          this._spiderG.add(new Graphic(pnt2, textSymbol2));

          degrees = Math.round(this._findDegreeTwoPoints(point2, pnt2));

          gg = this._findNewPoint(150, 95, (degrees - 90), this._len);
          this._context.beginPath();
          this._context.moveTo(gg.x, gg.y);
          this._context.lineTo(150, 95);
          this._context.lineWidth = 3;
          this._context.strokeStyle = lineSymbol.color.toHex();
          this._context.font = '10pt Calibri';
          this._context.fillStyle = '#000000';
          this._context.fillText(number.format(dTowers[1].dist), gg.x - 20, gg.y);
          this._context.stroke();

          var pLine3 = new Polyline();
          var pnt3 = new Point(dTowers[2].GEO.X, dTowers[2].GEO.Y);
          pLine3.addPath([mPnt, pnt3]);
          lineSymbol.setColor(new Color([45, 146, 247]));
          var pgra3 = new Graphic(pLine3, lineSymbol);
          this._spiderG.add(pgra3);

          var textSymbol3 = new TextSymbol(
              dTowers[2].GEO.id,
              font,
              new Color(this.config.labelColor)
          );
          this._spiderG.add(new Graphic(pnt3, textSymbol3));

          degrees = Math.round(this._findDegreeTwoPoints(point2, pnt3));

          gg = this._findNewPoint(150, 95, (degrees - 90), this._len);
          this._context.beginPath();
          this._context.moveTo(gg.x, gg.y);
          this._context.lineTo(150, 95);
          this._context.lineWidth = 3;
          this._context.strokeStyle = lineSymbol.color.toHex();
          this._context.font = '10pt Calibri';
          this._context.fillStyle = '#000000';
          this._context.fillText(number.format(dTowers[2].dist), gg.x - 20, gg.y);
          this._context.stroke();

      },

      onMouseMove: function(evt) {
        if (!this._closed){
          var n = dojo.byId('dbox1');   
            if (this._towers.length>0 && n.checked) {
                this._spiderG.clear();
                this._context.clearRect(0, 0, 1580, 1580);
                lang.hitch(this, this._processCenters(evt));
            }else {
              this._spiderG.clear();
              this._context.clearRect(0, 0, 1580, 1580);
            }        
        }
      }

  });
});