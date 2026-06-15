import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'core/theme/app_theme.dart';
import 'features/home/home_screen.dart';
import 'features/auth/auth_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Initialize Supabase with mock keys for structure validation
  await Supabase.initialize(
    url: 'https://placeholder-project.supabase.co',
    anonKey: 'placeholder-anon-key-1234567890',
  );

  runApp(
    const ProviderScope(
      child: NeoTunesApp(),
    ),
  );
}

class NeoTunesApp extends ConsumerWidget {
  const NeoTunesApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return MaterialApp(
      title: 'NeoTunes',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.darkTheme,
      home: const AuthScreen(),
    );
  }
}
