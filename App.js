import React, {useState} from 'react';

import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Image,
  Dimensions,
} from 'react-native';

import MapView, {Marker, Polyline} from 'react-native-maps';
const {width, height} = Dimensions.get('window');

const ASPECT_RATIO = width / height;
let LATITUDE = 0;
let LONGITUDE = 0;
let LATITUDE_DELTA = 0.001;
let LONGITUDE_DELTA = 0.001;

const App = () => {
  let map: any;
  const [mapInfo, setMapInfo] = useState({
    prevPos: {latitude: LATITUDE, longitude: LONGITUDE},
    curPos: {latitude: LATITUDE, longitude: LONGITUDE},
    curAng: 45,
    latitudeDelta: LATITUDE_DELTA,
    longitudeDelta: LONGITUDE_DELTA,
    route: [],
  });
  // changePosition = changePosition.bind(this);
  // getRotation = getRotation.bind(this);
  // updateMap = updateMap.bind(this);

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

  return (
    <View style={styles.flex}>
      <MapView
        ref={el => (map = el)}
        style={styles.flex}
        minZoomLevel={15}
        initialRegion={{
          ...mapInfo.curPos,
          latitudeDelta: mapInfo.latitudeDelta,
          longitudeDelta: mapInfo.longitudeDelta,
        }}>
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
});
export default App;
