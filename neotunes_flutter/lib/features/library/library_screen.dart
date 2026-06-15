import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/glassmorphic_card.dart';
import '../player/player_screen.dart';

class LibraryScreen extends ConsumerStatefulWidget {
  const LibraryScreen({Key? key}) : super(key: key);

  @override
  ConsumerState<LibraryScreen> createState() => _LibraryScreenState();
}

class _LibraryScreenState extends ConsumerState<LibraryScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  final List<Map<String, String>> _savedTracks = [
    {'title': 'Kesariya', 'artist': 'Arijit Singh', 'color': '#FF9933', 'downloaded': 'true'},
    {'title': 'Midnight City', 'artist': 'M83', 'color': '#7C3AED', 'downloaded': 'true'},
    {'title': 'Starboy', 'artist': 'The Weeknd', 'color': '#3B82F6', 'downloaded': 'false'},
    {'title': 'Lofi Rain', 'artist': 'Chillhop Cafe', 'color': '#10B981', 'downloaded': 'true'},
  ];

  final List<Map<String, String>> _playlists = [
    {'title': 'Late Night Coding', 'trackCount': '45', 'color': '#7C3AED'},
    {'title': 'Indie India Vibes', 'trackCount': '24', 'color': '#06B6D4'},
    {'title': 'Cyberpunk Visualizer', 'trackCount': '18', 'color': '#EC4899'},
  ];

  final List<Map<String, String>> _podcasts = [
    {'title': 'Lex Fridman Podcast', 'host': 'Lex Fridman', 'episodes': '420', 'genre': 'Science & Tech'},
    {'title': 'Huberman Lab', 'host': 'Dr. Andrew Huberman', 'episodes': '182', 'genre': 'Health & Fitness'},
    {'title': 'The Ranveer Show', 'host': 'Ranveer Allahbadia', 'episodes': '310', 'genre': 'Self Improvement'},
  ];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('YOUR LIBRARY', style: TextStyle(fontWeight: FontWeight.w900, letterSpacing: 1)),
        backgroundColor: Colors.transparent,
        elevation: 0,
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(48),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24.0),
            child: Container(
              height: 40,
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.04),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: Colors.white10),
              ),
              child: TabBar(
                controller: _tabController,
                indicator: BoxDecoration(
                  borderRadius: BorderRadius.circular(20),
                  gradient: const LinearGradient(
                    colors: [AppTheme.primaryPurple, AppTheme.secondaryBlue],
                  ),
                ),
                labelColor: Colors.white,
                unselectedLabelColor: AppTheme.textMuted,
                labelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, letterSpacing: 1),
                tabs: const [
                  Tab(text: 'MUSIC'),
                  Tab(text: 'PODCASTS'),
                ],
              ),
            ),
          ),
        ),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: TabBarView(
            controller: _tabController,
            children: [
              _buildMusicTab(),
              _buildPodcastsTab(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildMusicTab() {
    return ListView(
      children: [
        // Liked Songs Hero Box
        GestureDetector(
          onTap: () {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Playing Liked Songs shuffle...')),
            );
          },
          child: GlassmorphicCard(
            borderRadius: 20,
            borderColor: AppTheme.primaryPurple.withOpacity(0.2),
            child: Container(
              height: 120,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    AppTheme.primaryPurple.withOpacity(0.1),
                    AppTheme.secondaryBlue.withOpacity(0.2),
                  ],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
              ),
              padding: const EdgeInsets.all(20),
              child: Row(
                children: [
                  Container(
                    width: 80,
                    height: 80,
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [AppTheme.primaryPurple, AppTheme.accentCyan],
                        begin: Alignment.bottomLeft,
                        end: Alignment.topRight,
                      ),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(Icons.favorite, color: Colors.white, size: 36),
                  ),
                  const SizedBox(width: 16),
                  Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: const [
                      Text(
                        'Liked Songs',
                        style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900),
                      ),
                      SizedBox(height: 4),
                      Text(
                        '128 tracks • Downloaded offline',
                        style: TextStyle(color: AppTheme.textMuted, fontSize: 12),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
        const SizedBox(height: 32),

        // Playlists Section
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'PLAYLISTS',
              style: TextStyle(fontWeight: FontWeight.w900, letterSpacing: 1.5, fontSize: 11, color: AppTheme.textMuted),
            ),
            IconButton(
              icon: const Icon(Icons.add, color: AppTheme.accentCyan, size: 20),
              onPressed: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Create playlist modal...')),
                );
              },
            ),
          ],
        ),
        const SizedBox(height: 8),
        ..._playlists.map((playlist) {
          final playlistColor = Color(int.parse(playlist['color']!.replaceAll('#', '0xFF')));
          return Card(
            color: Colors.transparent,
            elevation: 0,
            margin: const EdgeInsets.only(bottom: 12),
            child: GlassmorphicCard(
              borderRadius: 12,
              child: ListTile(
                leading: Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: AppTheme.surfaceGrey,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: playlistColor.withOpacity(0.3)),
                  ),
                  child: Center(
                    child: Icon(Icons.playlist_play, color: playlistColor),
                  ),
                ),
                title: Text(playlist['title']!, style: const TextStyle(fontWeight: FontWeight.bold)),
                subtitle: Text('${playlist['trackCount']} tracks', style: const TextStyle(color: AppTheme.textMuted, fontSize: 12)),
                trailing: const Icon(Icons.arrow_forward_ios, size: 12, color: AppTheme.textMuted),
              ),
            ),
          );
        }).toList(),

        const SizedBox(height: 24),

        // Offline Saved Songs Section
        const Text(
          'OFFLINE SAVED TRACKS',
          style: TextStyle(fontWeight: FontWeight.w900, letterSpacing: 1.5, fontSize: 11, color: AppTheme.textMuted),
        ),
        const SizedBox(height: 12),
        ..._savedTracks.map((track) {
          final isDownloaded = track['downloaded'] == 'true';
          final trackColor = Color(int.parse(track['color']!.replaceAll('#', '0xFF')));
          return Card(
            color: Colors.transparent,
            elevation: 0,
            margin: const EdgeInsets.only(bottom: 12),
            child: GlassmorphicCard(
              borderRadius: 12,
              child: ListTile(
                leading: Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: AppTheme.surfaceGrey,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Center(
                    child: Icon(Icons.music_note, color: Colors.grey),
                  ),
                ),
                title: Text(track['title']!, style: const TextStyle(fontWeight: FontWeight.bold)),
                subtitle: Text(track['artist']!, style: const TextStyle(color: AppTheme.textMuted, fontSize: 12)),
                trailing: Icon(
                  isDownloaded ? Icons.offline_pin : Icons.download,
                  color: isDownloaded ? Colors.green : AppTheme.textMuted,
                ),
                onTap: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => PlayerScreen(
                        trackTitle: track['title']!,
                        trackArtist: track['artist']!,
                        trackColor: track['color']!,
                      ),
                    ),
                  );
                },
              ),
            ),
          );
        }).toList(),
      ],
    );
  }

  Widget _buildPodcastsTab() {
    return ListView(
      children: [
        const Text(
          'YOUR SUBSCRIPTIONS',
          style: TextStyle(fontWeight: FontWeight.w900, letterSpacing: 1.5, fontSize: 11, color: AppTheme.textMuted),
        ),
        const SizedBox(height: 12),
        ..._podcasts.map((podcast) {
          return Card(
            color: Colors.transparent,
            elevation: 0,
            margin: const EdgeInsets.only(bottom: 16),
            child: GlassmorphicCard(
              borderRadius: 16,
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: 64,
                      height: 64,
                      decoration: BoxDecoration(
                        color: AppTheme.surfaceGrey,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Center(
                        child: Icon(Icons.podcasts, color: AppTheme.accentCyan, size: 28),
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            podcast['title']!,
                            style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 15),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Host: ${podcast['host']}',
                            style: const TextStyle(color: AppTheme.textMuted, fontSize: 12),
                          ),
                          const SizedBox(height: 8),
                          Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                decoration: BoxDecoration(
                                  color: Colors.white10,
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: Text(
                                  podcast['genre']!,
                                  style: const TextStyle(fontSize: 10, color: AppTheme.textMuted, fontWeight: FontWeight.bold),
                                ),
                              ),
                              const SizedBox(width: 8),
                              Text(
                                '${podcast['episodes']} episodes',
                                style: const TextStyle(fontSize: 11, color: AppTheme.textMuted),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        }).toList(),
      ],
    );
  }
}
