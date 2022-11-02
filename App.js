import React, {useEffect, useState} from 'react';
import Geolocation from 'react-native-geolocation-service';

import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Image,
  Dimensions,
  PermissionsAndroid,
  Platform,
} from 'react-native';

import MapView, {
  AnimatedRegion,
  Marker,
  Polyline,
  PROVIDER_GOOGLE,
} from 'react-native-maps';
import haversine from 'haversine';

const {width, height} = Dimensions.get('window');

const ASPECT_RATIO = width / height;
let LATITUDE = 37.78825;
let LONGITUDE = -122.4324;
let LATITUDE_DELTA = 0.0922;
let LONGITUDE_DELTA = 0.0421;

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
const getLocation = () => {
  const result = requestLocationPermission();
  result.then(res => {
    if (res) {
      Geolocation.getCurrentPosition(
        position => {
          //console.log(position);
          // LATITUDE_DELTA = 0.001;
          LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;
          LATITUDE = position.coords.latitude;
          LONGITUDE = position.coords.longitude;
        },
        error => {
          // See error code charts below.
          console.log(error.code, error.message);
        },
        {enableHighAccuracy: true, timeout: 15000, maximumAge: 0},
      );
    }
  });
};
let track = true;

const App = () => {
  let map: any;
  getLocation();
  const [mapInfo, setMapInfo] = useState({
    prevPos: {latitude: LATITUDE, longitude: LONGITUDE},
    curPos: {latitude: LATITUDE, longitude: LONGITUDE},
    curAng: 45,
    latitudeDelta: LATITUDE_DELTA,
    longitudeDelta: LONGITUDE_DELTA,
    route: [],
  });

  const getMapRegion = () => {
    return {
      latitude: LATITUDE,
      longitude: LONGITUDE,
      latitudeDelta: LATITUDE_DELTA,
      longitudeDelta: LONGITUDE_DELTA,
    };
  };

  useEffect(() => {
    let watchID = Geolocation.watchPosition(
      position => {
        const {latitude, longitude} = position.coords;
        const newCoordinate = {
          latitude,
          longitude,
        };

        const table1 = mapInfo.route.concat([newCoordinate]);
        setMapInfo({
          prevPos: mapInfo.curPos,
          curPos: newCoordinate,
          route: table1,
        });
        console.log('position.coords = ', JSON.stringify(position));
        console.log('position.coords = ', position.coords.latitude);
        console.log('position.coords = ', position.coords.longitude);
        // console.log('button pressed = ', press);
        console.log('track activated pressed = ', track);
      },
      error => console.log(error),
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 5000,
        distanceFilter: 10,
      },
    );
    return () => Geolocation.clearWatch(watchID);
  }, [mapInfo]);

  const changePosition = (latOffset: number, lonOffset: number) => {
    const latitude = mapInfo.curPos.latitude + latOffset;
    const longitude = mapInfo.curPos.longitude + lonOffset;
    let table = mapInfo.route.concat(mapInfo.curPos);
    setMapInfo({
      prevPos: mapInfo.curPos,
      curPos: {latitude, longitude},
      route: table,
    });
    console.log(mapInfo.route);
    updateMap();
  };

  const getRotation = (prevPos: any, curPos: any) => {
    if (!prevPos) {
      return 0;
    }
    const xDiff = curPos.latitude - prevPos.latitude;
    const yDiff = curPos.longitude - prevPos.longitude;
    return (Math.atan2(yDiff, xDiff) * 180.0) / Math.PI;
  };

  const updateMap = () => {
    const {curPos, prevPos, curAng} = mapInfo;
    const curRot = getRotation(prevPos, curPos);
    map.animateCamera({heading: curRot, center: curPos, pitch: curAng});
  };
  const trackPosition = () => {
    track = !track;
    console.log('track over function ', track);
    track ? Geolocation.clearWatch() : setMapInfo({...mapInfo});
  };
  return (
    <View style={styles.flex}>
      <MapView
        provider={PROVIDER_GOOGLE}
        ref={el => (map = el)}
        style={styles.flex}
        minZoomLevel={15}
        region={getMapRegion()}>
        <Polyline
          coordinates={mapInfo.route}
          strokeWidth={10}
          strokeColor={'#2353b2'}
          pinColor="#ce3624"
        />
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
          onPress={() => changePosition(0.0001, 0)}>
          <Text>+ Lat</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.down]}
          onPress={() => changePosition(-0.0001, 0)}>
          <Text>- Lat</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.buttonContainerLeftRight}>
        <TouchableOpacity
          style={[styles.button, styles.left]}
          onPress={() => changePosition(0, -0.0001)}>
          <Text>- Lon</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.right]}
          onPress={() => changePosition(0, 0.0001)}>
          <Text>+ Lon</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[track ? styles.buttonPressed : styles.button, styles.corner]}
          onPress={() => trackPosition()}>
          <Text>Track</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
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
  buttonPressed: {
    backgroundColor: 'rgba(0,100,100,0.8)',
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    height: 50,
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
  corner: {
    right: 0,
    top: 0,
  },
});
export default App;
