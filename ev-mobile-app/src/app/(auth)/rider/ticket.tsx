import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../providers/AuthProvider';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { ScreenWrapper } from '../../../components/ui/ScreenWrapper';
import { ModernCard } from '../../../components/ui/ModernCard';
import { ChevronLeft, MapPin, ImagePlus, X } from 'lucide-react-native';

const PREDEFINED_ISSUES = [
  'Bike not working / Stopped',
  'Throttle / Motor symbol'
];

export default function RiderTicketScreen() {
  const { session } = useAuth();
  const router = useRouter();

  const [bikeNumber, setBikeNumber] = useState('');
  const [selectedIssue, setSelectedIssue] = useState('');
  const [detailedIssue, setDetailedIssue] = useState('');
  const [contactNumber, setContactNumber] = useState(session?.user?.phone?.replace('+', '') || '');
  
  // Location & Media State
  const [locationStr, setLocationStr] = useState('');
  const [fetchingLoc, setFetchingLoc] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [riderId, setRiderId] = useState<string | null>(null);

  useEffect(() => {
    const fetchRiderInfo = async () => {
      const phoneNo = session?.user?.phone?.replace(/\D/g, '').slice(-10);
      if (!phoneNo) return;

      const { data: rider } = await supabase.from('riders').select('id, name').eq('phone', phoneNo).single();
      
      if (rider) {
        setRiderId(rider.id);
        const { data: assignment } = await supabase
          .from('rider_bike_assignments')
          .select(`bikes (bike_number)`)
          .eq('rider_id', rider.id)
          .is('unassigned_at', null)
          .single();
          
        if (assignment && assignment.bikes) {
          setBikeNumber(assignment.bikes.bike_number);
        }
      }
    };
    fetchRiderInfo();
  }, [session]);

  const handleGetLocation = async () => {
    setFetchingLoc(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Permission to access location was denied');
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      const coords = `${location.coords.latitude}, ${location.coords.longitude}`;
      setLocationStr(coords);
      
      try {
        let geocode = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
        if (geocode && geocode.length > 0) {
          const addr = geocode[0];
          const readable = `${addr.name || addr.street}, ${addr.city}, ${addr.region}`;
          setLocationStr(readable);
        }
      } catch (e) {}

    } catch (e) {
      Alert.alert('Error', 'Failed to fetch location');
    } finally {
      setFetchingLoc(false);
    }
  };

  const handlePickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission Denied', 'Permission to access camera roll is required!');
        return;
      }

      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImageUri(result.assets[0].uri);
        setImageBase64(result.assets[0].base64 || null);
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleUploadImage = async (base64Str: string): Promise<string | null> => {
    try {
      const fileName = `riders/${session?.user?.id}/${Date.now()}.jpg`;
      const { data, error } = await supabase.storage
        .from('ticket-images')
        .upload(fileName, decode(base64Str), {
          contentType: 'image/jpeg',
        });
        
      if (error) {
        console.error('Upload Error:', error);
        return null;
      }
      
      const { data: { publicUrl } } = supabase.storage
        .from('ticket-images')
        .getPublicUrl(fileName);
        
      return publicUrl;
    } catch (e) {
      console.error(e);
      return null;
    }
  };

  const handleLogTicket = async () => {
    if (!bikeNumber) {
      Alert.alert('Error', 'Please enter a Bike Number');
      return;
    }
    if (!selectedIssue && !detailedIssue) {
      Alert.alert('Error', 'Please select an issue or type it in detail.');
      return;
    }

    setLoading(true);

    try {
      let uploadedImageUrl = null;
      if (imageBase64) {
        uploadedImageUrl = await handleUploadImage(imageBase64);
      }

      const ticketNo = `RDR-${Math.floor(1000 + Math.random() * 9000)}`;
      
      const combinedIssue = [selectedIssue, detailedIssue].filter(Boolean).join(' - ');

      const { data, error } = await supabase
        .from('tickets')
        .insert([
          {
            ticket_no: ticketNo,
            ticket_type: 'rider',
            bike_number_text: bikeNumber.toUpperCase(),
            issue_description: combinedIssue,
            location: locationStr || 'Location not provided',
            contact: contactNumber,
            image_path: uploadedImageUrl,
            status: 'open',
          },
        ])
        .select()
        .single();

      if (error) throw error;

      Alert.alert('Success', `Ticket ${ticketNo} created successfully!`, [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenWrapper className="bg-zinc-50 dark:bg-zinc-950" withKeyboard>
      <View className="flex-row items-center justify-between px-4 py-4 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <TouchableOpacity onPress={() => router.back()} className="w-12 h-12 justify-center items-center rounded-full bg-zinc-50 dark:bg-zinc-800">
          <ChevronLeft color="#18181b" size={24} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-zinc-900 dark:text-white tracking-tight">Fleet Service Ticket</Text>
        <View className="w-12 h-12" />
      </View>

      <ScrollView contentContainerClassName="px-6 py-6 pb-20">
        
        <ModernCard className="mb-6">
          <View className="mb-4">
            <Text className="text-xs font-bold text-zinc-500 dark:text-zinc-400 mb-2 uppercase tracking-wider">Bike Number</Text>
            <View className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl px-4 h-14 justify-center">
              <TextInput 
                className="flex-1 text-base font-bold text-zinc-900 dark:text-white uppercase tracking-wider" 
                placeholder="e.g. MH 01 AB 1234" 
                placeholderTextColor="#a1a1aa" 
                value={bikeNumber} 
                onChangeText={setBikeNumber} 
                autoCapitalize="characters" 
              />
            </View>
          </View>

          <View>
            <Text className="text-xs font-bold text-zinc-500 dark:text-zinc-400 mb-2 uppercase tracking-wider">Contact Number</Text>
            <View className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl px-4 h-14 justify-center">
              <TextInput 
                className="flex-1 text-base font-semibold text-zinc-900 dark:text-white" 
                placeholder="Enter contact number" 
                placeholderTextColor="#a1a1aa" 
                value={contactNumber} 
                onChangeText={setContactNumber}
                keyboardType="phone-pad"
              />
            </View>
          </View>
        </ModernCard>

        <ModernCard className="mb-6">
          <Text className="text-lg font-bold text-zinc-900 dark:text-white mb-5 tracking-tight">What's the issue?</Text>
          
          <View className="flex-row flex-wrap mb-2">
            {PREDEFINED_ISSUES.map((issue) => {
              const isActive = selectedIssue === issue;
              return (
                <TouchableOpacity 
                  key={issue}
                  className={`px-4 py-2.5 rounded-full mr-3 mb-3 border ${isActive ? 'bg-brand border-brand' : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700'}`}
                  onPress={() => setSelectedIssue(isActive ? '' : issue)}
                >
                  <Text className={`font-semibold ${isActive ? 'text-white' : 'text-zinc-600 dark:text-zinc-400'}`}>
                    {issue}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View className="mb-6">
            <Text className="text-xs font-bold text-zinc-500 dark:text-zinc-400 mb-2 uppercase tracking-wider">Issue in Detail</Text>
            <View className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl px-4 py-3 min-h-[100px]">
              <TextInput 
                className="flex-1 text-base font-medium text-zinc-900 dark:text-white leading-relaxed text-justify"
                placeholder="Describe what happened..." 
                placeholderTextColor="#a1a1aa"
                value={detailedIssue} 
                onChangeText={setDetailedIssue} 
                multiline 
                textAlignVertical="top"
              />
            </View>
          </View>

          <View className="mb-6">
            <Text className="text-xs font-bold text-zinc-500 dark:text-zinc-400 mb-2 uppercase tracking-wider">Breakdown Location</Text>
            <View className="flex-row items-center">
              <View className="flex-1 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl px-4 h-14 justify-center mr-3">
                <TextInput 
                  className="flex-1 text-base font-medium text-zinc-900 dark:text-white"
                  placeholder="Tap icon to fetch GPS" 
                  placeholderTextColor="#a1a1aa"
                  value={locationStr} 
                  onChangeText={setLocationStr} 
                />
              </View>
              <TouchableOpacity 
                className="w-14 h-14 bg-brand rounded-2xl justify-center items-center shadow-md shadow-brand/30" 
                onPress={handleGetLocation} 
                disabled={fetchingLoc}
              >
                {fetchingLoc ? <ActivityIndicator size="small" color="#fff" /> : <MapPin color="#fff" size={24} strokeWidth={2} />}
              </TouchableOpacity>
            </View>
          </View>

          <View>
            <Text className="text-xs font-bold text-zinc-500 dark:text-zinc-400 mb-2 uppercase tracking-wider">Upload Image (Optional)</Text>
            {imageUri ? (
              <View className="relative w-full h-48 rounded-2xl overflow-hidden">
                <Image source={{ uri: imageUri }} className="w-full h-full" resizeMode="cover" />
                <TouchableOpacity 
                  className="absolute top-3 right-3 bg-black/60 w-8 h-8 rounded-full justify-center items-center backdrop-blur-md"
                  onPress={() => { setImageUri(null); setImageBase64(null); }}
                >
                  <X color="#fff" size={16} strokeWidth={3} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity 
                className="bg-zinc-50 dark:bg-zinc-800/50 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-2xl h-32 justify-center items-center" 
                onPress={handlePickImage}
              >
                <ImagePlus color="#a1a1aa" size={32} strokeWidth={1.5} className="mb-2" />
                <Text className="text-zinc-500 dark:text-zinc-400 font-semibold">Tap to attach photo</Text>
              </TouchableOpacity>
            )}
          </View>
        </ModernCard>

        <TouchableOpacity 
          className={`h-16 rounded-2xl justify-center items-center shadow-lg shadow-brand/30 ${loading ? 'bg-brand/70' : 'bg-brand'}`}
          onPress={handleLogTicket} 
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text className="text-white text-lg font-bold tracking-wide">Submit Ticket</Text>}
        </TouchableOpacity>

      </ScrollView>
    </ScreenWrapper>
  );
}
