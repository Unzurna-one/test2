import React, {useEffect, useState} from 'react';
import Geolocation from 'react-native-geolocation-service';
import firestore, {firebase} from '@react-native-firebase/firestore';

import {
  Dimensions,
  Image,
  PermissionsAndroid,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import MapView, {Marker, Polyline, PROVIDER_GOOGLE} from 'react-native-maps';
import haversine from 'haversine';

const {width, height} = Dimensions.get('window');

const ASPECT_RATIO = width / height;
let LATITUDE;
let LONGITUDE;
let LATITUDE_DELTA;
let LONGITUDE_DELTA;

// Function to get permission for location
const requestLocationPermission = async () => {
  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: 'Geolocation Permission',
        message: 'Can we access your location?',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'OK',
      },
    );
    //console.log('granted', granted);
    return granted === 'granted';
  } catch (err) {
    return false;
  }
};

// function to check permissions and get Location
const getLocation = async () => {
  try {
    const result = await requestLocationPermission();

    if (result) {
      return new Promise((resolve, reject) => {
        Geolocation.getCurrentPosition(position => {
          resolve(position);
        });
      });

      // Geolocation.getCurrentPosition(
      //   position => {
      //     console.log('current position = ', position);
      //     LATITUDE_DELTA = 0.0922;
      //     LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;
      //     LATITUDE = position.coords.latitude;
      //     LONGITUDE = position.coords.longitude;
      //   },
      //   error => {
      //     // See error code charts below.
      //     console.log(error.code, error.message);
      //   },
      //   {enableHighAccuracy: false, timeout: 15000, maximumAge: 1000},
      // );
    }
  } catch (error) {
    console.log(error);
  }
};

const useConstructor = (callBack = () => {}) => {
  const [hasBeenCalled, setHasBeenCalled] = useState(false);
  if (hasBeenCalled) {
    return;
  }
  callBack();
  setHasBeenCalled(true);
};

let track = true;

const getData = async () => {
  const col = await firestore().collection('lines').get();
  const result = [];
  //console.log('collection =', col);
  if (col.size) {
    //Array.from(col).sort((a, b) => a[1] - b[1]);
    // Object.entries(col)
    //   .sort(([, a], [, b]) => a.data().id - b.data().id)
    //   .reduce(
    //     (r, [k, v]) => ({
    //       ...r,
    //       [k]: v,
    //     }),
    //     {},
    //   );

    col.forEach((doc, i) => {
      // console.log('doc =', doc);
      // console.log('doc.data().route =', doc.data().route);
      doc.color = '#' + Math.floor(Math.random() * 16777215).toString(16);
      const data = JSON.parse(doc.data().route);
      result.push({color: doc.color, data: data});
    });
  }
  console.log('result =', result);
  return result;
};
let i = 0;

const App = () => {
  useConstructor(() => {
    console.log(
      ':::::::::::::::::::::::::: Occurs ONCE, BEFORE the initial render.:::::::::::::::::::::::::::::::::::::::',
    );
    const loc = getLocation();

    loc.then(r => {
      LATITUDE_DELTA = 0.0922;
      LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;
      LATITUDE = r.coords.latitude;
      LONGITUDE = r.coords.longitude;
    });
  });

  let map: any;

  const [mapInfo, setMapInfo] = useState({
    prevPos: {latitude: 0, longitude: 0},
    curPos: {latitude: 0, longitude: 0},
    curAng: 45,
    latitudeDelta: LATITUDE_DELTA,
    longitudeDelta: LONGITUDE_DELTA,
    distanceTravelled: 0,
    route: [],
    lines: [],
  });

  const getMapRegion = () => {
    return {
      // latitude: mapInfo?.curPos.latitude ? mapInfo?.curPos.latitude : LATITUDE,
      // longitude: mapInfo?.curPos.longitude
      //   ? mapInfo?.curPos.longitude
      //   : LONGITUDE,
      // latitudeDelta: LATITUDE_DELTA,
      // longitudeDelta: LONGITUDE_DELTA,
      latitude: LATITUDE,
      longitude: LONGITUDE,
      latitudeDelta: LATITUDE_DELTA,
      longitudeDelta: LONGITUDE_DELTA,
    };
  };
  const lineThreshold = 200;
  const calcDistance = newLatLng => {
    // console.log('mapInfo.prevPos = ', mapInfo.prevPos);
    //  console.log('mapInfo.curPos = ', mapInfo.curPos);

    const prevLatLng =
      mapInfo.prevPos?.longitude && true ? mapInfo.prevPos : newLatLng;
    //console.log('prevLatLng = ', prevLatLng);
    //console.log('newLatLng = ', newLatLng);

    return haversine(prevLatLng, newLatLng, {unit: 'meter'}) || 0;
  };

  let watchID;

  function displayLines() {
    getData().then(res => {
      //console.log('res =', res);
      setMapInfo(prev => ({...prev, lines: res}));
    });
  }

  const [pos, setPos] = useState([]);
  useEffect(() => {
    //console.log('useEffect 2 :::: ');

    //console.log('mapInfo = ', mapInfo);
    let {route, distanceTravelled} = mapInfo;
    //console.log('mapInfo = ', mapInfo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    watchID = Geolocation.watchPosition(
      position => {
        if (position.coords !== pos) {
          setPos(position.coords);
          const {latitude, longitude} = position.coords;
          const newCoordinate = {latitude, longitude};
          // console.log('position = ', position.coords);
          //console.log('newCoordinate = ', newCoordinate);
          console.log('distanceTravelled = ', distanceTravelled);
          const delta = calcDistance(newCoordinate);

          console.log('delta = ', delta);
          console.debug('route[route.length - 1] = ', route[route.length - 1]);
          console.debug('newCoordinate = ', newCoordinate);

          console.debug(
            'test = ',
            JSON.stringify(route[route.length - 1]) !==
              JSON.stringify(newCoordinate),
          );
          let table =
            delta < 2
              ? route
              : distanceTravelled < lineThreshold &&
                JSON.stringify(route[route.length - 1]) !==
                  JSON.stringify(newCoordinate)
              ? route.concat([newCoordinate])
              : distanceTravelled < lineThreshold &&
                JSON.stringify(route[route.length - 1]) ===
                  JSON.stringify(newCoordinate)
              ? route
              : [].concat(route[route.length - 1]).concat([newCoordinate]);
          console.log('TABLE =', table);

          setMapInfo(prev => ({
            ...prev,
            prevPos: mapInfo?.curPos && true ? mapInfo.curPos : newCoordinate,
            curPos: newCoordinate,
            route: table,
            distanceTravelled:
              distanceTravelled > lineThreshold
                ? +0
                : distanceTravelled + delta,
          }));
          // if (
          //   distanceTravelled < lineThreshold &&
          //   JSON.stringify(route[route.length - 1]) ===
          //     JSON.stringify(newCoordinate)
          // ) {
          //   table = [];
          // }

          console.log('mapInfo updated 1 =', mapInfo.curPos);
          //console.log('distanceTravelled = ', mapInfo.distanceTravelled);
          if (distanceTravelled > lineThreshold && mapInfo.route.length) {
            const maDate = new Date();
            i = i + 1;

            firestore()
              .collection('lines')
              .doc(
                'id' + i.toString().padStart(5 - i.toString().length - 1, '0'),
              )
              .set({
                dist: distanceTravelled,
                route: JSON.stringify(mapInfo.route),
                date: maDate.toLocaleDateString('fr'),
              })
              .then(() => {
                console.log('route added!');
              });
            //distanceTravelled = 0;
          }

          //console.log('mapInfo.route =', mapInfo.route);

          //console.log('position = ', JSON.stringify(position));
          //console.log('position.coords.latitude = ', position.coords.latitude);
          //console.log('position.coords.longitude = ', position.coords.longitude);
          //console.log('track activated pressed = ', track);
        }
      },
      error => console.log(error),
      {
        enableHighAccuracy: true,
        timeout: 0,
        maximumAge: 0,
        distanceFilter: 10,
      },
    );
    return () => Geolocation.clearWatch(watchID);
  }, [mapInfo, watchID]);

  const changePosition = (latOffset: number, lonOffset: number) => {
    const latitude = mapInfo.curPos.latitude + latOffset;
    const longitude = mapInfo.curPos.longitude + lonOffset;
    //let table = mapInfo.route.concat(mapInfo.curPos);
    //Geolocation.clearWatch(watchID);
    // setMapInfo(prev => ({
    //   ...prev,
    //   // prevPos: mapInfo.curPos,
    //   curPos: {latitude, longitude},
    //   //  route: table,
    // }));
    //console.log(' >>>>>>>>>>>>>>  change position <<<<<<<<<<<<<<<<<<<');
    //console.log('mapInfo updated 2 =', mapInfo.curPos);
    //
    // console.log('previous', mapInfo.prevPos);
    // console.log('current', mapInfo.curPos);

    updateMap({latitude, longitude});
  };

  const getRotation = (prevPos: any, curPos: any) => {
    if (!prevPos) {
      return 0;
    }
    const xDiff = curPos.latitude - prevPos.latitude;
    const yDiff = curPos.longitude - prevPos.longitude;
    return (Math.atan2(yDiff, xDiff) * 180.0) / Math.PI;
  };

  const updateMap = ({latitude, longitude}) => {
    const {prevPos, curAng} = mapInfo;
    const curRot = getRotation(prevPos, {latitude, longitude});
    map.animateCamera({
      heading: curRot,
      center: {latitude, longitude},
      pitch: curAng,
    });
    setMapInfo({...mapInfo});
  };
  const trackPosition = () => {
    track = !track;
    console.log('track over function ', track);
    track ? Geolocation.stopObserving() : setMapInfo({...mapInfo});
  };

  if (LATITUDE && LONGITUDE && mapInfo.curPos) {
    return (
      <View style={styles.flex}>
        <MapView
          provider={PROVIDER_GOOGLE}
          ref={el => (map = el)}
          style={styles.flex}
          minZoomLevel={15}
          region={getMapRegion()}>
          {mapInfo.lines ? (
            <Polyline
              coordinates={mapInfo.route}
              strokeWidth={10}
              strokeColor={
                '#' + Math.floor(Math.random() * 16777215).toString(16)
              }
              pinColor={'#' + Math.floor(Math.random() * 16777215).toString(16)}
            />
          ) : null}
          {mapInfo.lines ? (
            <View>
              {mapInfo.lines.map((value, index) => {
                return (
                  <Polyline
                    key={index}
                    coordinates={value.data}
                    strokeWidth={10}
                    strokeColor={value.color}
                    pinColor={
                      '#' + Math.floor(Math.random() * 16777215).toString(16)
                    }
                  />
                );
              })}
            </View>
          ) : null}
          <Marker coordinate={mapInfo.curPos} anchor={{x: 0.5, y: 0.5}}>
            <Image
              source={require('./assets/car.jpg')}
              style={{width: 40, height: 40}}
            />
          </Marker>
        </MapView>
        <View style={styles.buttonContainerUpDown}>
          <TouchableOpacity
            style={[styles.button, styles.up]}
            onPress={() => changePosition(0.001, 0)}>
            <Text>+ Lat</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.down]}
            onPress={() => changePosition(-0.001, 0)}>
            <Text>- Lat</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.buttonContainerLeftRight}>
          <TouchableOpacity
            style={[styles.button, styles.left]}
            onPress={() => changePosition(0, -0.001)}>
            <Text>- Lon</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.right]}
            onPress={() => changePosition(0, 0.001)}>
            <Text>+ Lon</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              track ? styles.toggleOn : styles.toggleOff,
              styles.cornerTopRight,
            ]}
            onPress={() => trackPosition()}>
            <Text>Track</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              track ? styles.toggleOn : styles.toggleOff,
              styles.cornerTopLeft,
            ]}
            onPress={() => displayLines()}>
            <Text>Lines</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
};
const styles = StyleSheet.create({
  flex: {
    flex: 1,
    width: '100%',
  },
  buttonContainerUpDown: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  buttonContainerLeftRight: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'column',
    justifyContent: 'center',
  },
  toggleOn: {
    backgroundColor: 'rgba(0,100,100,0.8)',
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    margin: 10,
    borderRadius: 10,
    height: 30,
    width: 50,
  },
  button: {
    backgroundColor: 'rgba(100,100,100,0.2)',
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    height: 50,
    width: 50,
  },
  toggleOff: {
    margin: 10,
    backgroundColor: 'rgba(100,100,100,0.2)',
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    height: 30,
    width: 50,
  },
  up: {
    alignSelf: 'flex-start',
  },
  down: {
    alignSelf: 'flex-end',
  },
  left: {
    alignSelf: 'flex-start',
  },
  right: {
    alignSelf: 'flex-end',
  },
  cornerTopRight: {
    right: 0,
    top: 0,
  },
  cornerTopLeft: {
    left: 0,
    top: 0,
  },
});
export default App;
