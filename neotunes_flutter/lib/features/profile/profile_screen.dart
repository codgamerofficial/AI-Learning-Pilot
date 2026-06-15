import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/glassmorphic_card.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({Key? key}) : super(key: key);

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  int _expandedFaqIndex = -1;
  String _downloadQuality = 'HD';
  bool _dataSaver = false;

  final List<Map<String, String>> _faqItems = [
    {
      "question": "How does background playback work?",
      "answer": "NeoTunes uses a background audio foreground service to ensure your streams continue playing even when the app is minimized, the screen is locked, or you switch to other apps. Keep background permissions enabled in your OS settings."
    },
    {
      "question": "What is the NeoMix AI Co-Pilot?",
      "answer": "NeoMix uses natural language processing to curate custom playlists. Just type what you're feeling (e.g., 'driving in rain' or 'gym pump up') on the Home screen and the AI will assemble the perfect track sequence."
    },
    {
      "question": "How do I download songs for offline playback?",
      "answer": "Go to your Saved Tracks segment in My Library, and tap the download icon next to any song. A green checkmark indicates that the song is cached locally and available in Offline Mode."
    }
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('PROFILE', style: TextStyle(fontWeight: FontWeight.w900)),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          // User card
          GlassmorphicCard(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                children: [
                  CircleAvatar(
                    radius: 36,
                    backgroundColor: AppTheme.primaryPurple,
                    child: const Text('AN', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.black)),
                  ),
                  const SizedBox(height: 12),
                  const Text('Acoustic Navigator', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900)),
                  const SizedBox(height: 4),
                  const Text('premium account', style: TextStyle(color: AppTheme.primaryPurple, fontSize: 11, fontWeight: FontWeight.bold)),
                ],
              ),
            ),
          ),
          const SizedBox(height: 32),

          const Text('PREFERENCES', style: TextStyle(fontWeight: FontWeight.w900, letterSpacing: 1.5, fontSize: 11, color: AppTheme.textMuted)),
          const SizedBox(height: 12),

          // Download Quality Tile
          _buildSettingsTile(
            title: 'Download Quality',
            subtitle: _downloadQuality,
            icon: Icons.download,
            onTap: () {
              setState(() {
                _downloadQuality = _downloadQuality == 'HD' ? 'SD' : 'HD';
              });
            },
          ),

          // Data Saver Tile
          SwitchListTile(
            title: const Text('Data Saver', style: TextStyle(fontWeight: FontWeight.bold)),
            subtitle: const Text('Optimize bandwidth limits for audio', style: TextStyle(color: AppTheme.textMuted, fontSize: 12)),
            secondary: const Icon(Icons.network_ping, color: AppTheme.primaryPurple),
            value: _dataSaver,
            onChanged: (val) {
              setState(() {
                _dataSaver = val;
              });
            },
          ),
          const SizedBox(height: 32),

          const Text('FAQ & SUPPORT', style: TextStyle(fontWeight: FontWeight.w900, letterSpacing: 1.5, fontSize: 11, color: AppTheme.textMuted)),
          const SizedBox(height: 12),

          // Collapsible FAQ Accordion
          GlassmorphicCard(
            child: Column(
              children: List.generate(_faqItems.length, (index) {
                final item = _faqItems[index];
                final isExpanded = _expandedFaqIndex == index;
                return Column(
                  children: [
                    ListTile(
                      title: Text(item['question']!, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                      trailing: Text(
                        isExpanded ? '−' : '+',
                        style: const TextStyle(color: AppTheme.primaryPurple, fontWeight: FontWeight.bold, fontSize: 18),
                      ),
                      onTap: () {
                        setState(() {
                          _expandedFaqIndex = isExpanded ? -1 : index;
                        });
                      },
                    ),
                    if (isExpanded)
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                        child: Text(item['answer']!, style: const TextStyle(color: AppTheme.textMuted, fontSize: 12, height: 1.5)),
                      ),
                  ],
                );
              }),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSettingsTile({required String title, required String subtitle, required IconData icon, required VoidCallback onTap}) {
    return ListTile(
      leading: Icon(icon, color: AppTheme.primaryPurple),
      title: Text(title, style: const TextStyle(fontWeight: FontWeight.bold)),
      trailing: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
        decoration: BoxDecoration(
          color: AppTheme.primaryPurple.withOpacity(0.15),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Text(subtitle, style: const TextStyle(color: AppTheme.primaryPurple, fontWeight: FontWeight.bold, fontSize: 12)),
      ),
      onTap: onTap,
    );
  }
}
