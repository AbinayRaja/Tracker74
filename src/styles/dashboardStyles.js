import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F5F9',
  },

  header: {
    height: 80,
    backgroundColor: '#6FA3E7',
    // borderTopLeftRadius: 25,
    // borderTopRightRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },

  headerText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '600',
  },

  mainCard: {
    // marginTop: -40,
    backgroundColor: '#fff',
    // marginHorizontal: 16,
    borderRadius: 20,
    padding: 16,
    // elevation: 5,
  },

  liveHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginVertical: 20,
  },

  searchBox: {
    flexDirection: 'row',
    backgroundColor: '#F1F3F6',
    paddingHorizontal: 37,
    borderRadius: 20,
    alignItems: 'center',
  },

  searchInput: {
    width: 80,
    padding: 6,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  gridCard: {
    width: '48%',
    height: 120,
    borderRadius: 15,
    padding: 12,
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  blueCard: {
    backgroundColor: '#CFE1F9',
  },

  redCard: {
    backgroundColor: '#F7C3C3',
  },

  greenCard: {
    backgroundColor: '#CDEDE2',
  },

  smallText: {
    fontSize: 12,
    color: '#555',
  },

  bigText: {
    fontSize: 28,
    fontWeight: '700',
  },

  footerText: {
    fontSize: 14,
    color: '#444',
  },

  reportCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 12,
    elevation: 2,
  },

  reportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  reportTitle: {
    fontSize: 14,
    fontWeight: '600',
  },

  reportSub: {
    fontSize: 12,
    color: '#777',
  },

  reportDate: {
    fontSize: 12,
    color: '#555',
  },

  divider: {
    height: 1,
    backgroundColor: '#EEE',
    marginVertical: 10,
  },

  salesInfo: {
    marginTop: 15,
    backgroundColor: '#F4F6FA',
    borderRadius: 15,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  salesLeft: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },

  salesTitle: {
    fontWeight: '600',
  },

  salesSub: {
    fontSize: 12,
    color: '#777',
  },

  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F3F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderColor: '#CFE1F9',
    borderWidth: 1
  },

  dropdownText: {
    marginRight: 6,
    color: '#333',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },

  dropdownList: {
    borderColor: '#CFE1F9',
    borderWidth: 1,
    position: 'absolute',
    top: 140,
    right: 15,
    width: 170,
    backgroundColor: '#fff',
    borderRadius: 12,
    elevation: 6,
  },



  dropdownItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },

});
