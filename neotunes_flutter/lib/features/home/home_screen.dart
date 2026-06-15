import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/glassmorphic_card.dart';
import '../../core/widgets/equalizer_bars.dart';
import '../player/player_screen.dart';
import '../profile/profile_screen.dart';
import '../search/search_screen.dart';
import '../library/library_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({Key? key}) : super(key: key);

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _currentIndex = 0;
  
  // Track state for the persistent mini player
  String? _currentTrackTitle = 'Kesariya';
  String? _currentTrackArtist = 'Arijit Singh';
  String _currentTrackColor = '#FF9933';
  bool _isPlaying = false;

  late final List<Widget> _screens;

  @override
  void initState() {
    super.initState();
    _screens = [
      _HomeFeedView(
        onTrackSelected: (title, artist, color) {
          setState(() {
            _currentTrackTitle = title;
            _currentTrackArtist = artist;
            _currentTrackColor = color;
            _isPlaying = true;
          });
        },
      ),
      const SearchScreen(),
      const LibraryScreen(),
      const ProfileScreen(),
    ];
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          // Screen views
          IndexedStack(
            index: _currentIndex,
            children: _screens,
          ),
          
          // Persistent Mini Player above Navigation Bar
          if (_currentTrackTitle != null)
            Positioned(
              left: 16,
              right: 16,
              bottom: kBottomNavigationBarHeight + 16,
              child: GestureDetector(
                onTap: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => PlayerScreen(
                        trackTitle: _currentTrackTitle!,
                        trackArtist: _currentTrackArtist!,
                        trackColor: _currentTrackColor,
                      ),
                    ),
                  );
                },
                child: GlassmorphicCard(
                  borderRadius: 16,
                  borderColor: Colors.white10,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                    child: Row(
                      children: [
                        // Mini Album Artwork
                        Container(
                          width: 44,
                          height: 44,
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(8),
                            color: AppTheme.surfaceGrey,
                          ),
                          child: Center(
                            child: _isPlaying 
                                ? EqualizerBars(
                                    color: Color(int.parse(_currentTrackColor.replaceAll('#', '0xFF'))),
                                    barCount: 3,
                                    height: 16,
                                    active: true,
                                  )
                                : const Icon(Icons.music_note, color: Colors.grey, size: 20),
                          ),
                        ),
                        const SizedBox(width: 12),
                        // Track Title and Artist
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                _currentTrackTitle!,
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                              const SizedBox(height: 2),
                              Text(
                                _currentTrackArtist!,
                                style: const TextStyle(color: AppTheme.textMuted, fontSize: 11),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ],
                          ),
                        ),
                        // Play/Pause Action
                        IconButton(
                          icon: Icon(
                            _isPlaying ? Icons.pause : Icons.play_arrow,
                            color: Colors.white,
                          ),
                          onPressed: () {
                            setState(() {
                              _isPlaying = !_isPlaying;
                            });
                          },
                        ),
                        // Close Player
                        IconButton(
                          icon: const Icon(Icons.close, color: AppTheme.textMuted, size: 20),
                          onPressed: () {
                            setState(() {
                              _currentTrackTitle = null;
                              _currentTrackArtist = null;
                            });
                          },
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          border: Border(top: BorderSide(color: Colors.white10, width: 0.5)),
        ),
        child: BottomNavigationBar(
          currentIndex: _currentIndex,
          onTap: (index) {
            setState(() {
              _currentIndex = index;
            });
          },
          type: BottomNavigationBarType.fixed,
          backgroundColor: AppTheme.backgroundBlack,
          selectedItemColor: AppTheme.primaryPurple,
          unselectedItemColor: AppTheme.textMuted,
          selectedLabelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 11),
          unselectedLabelStyle: const TextStyle(fontWeight: FontWeight.normal, fontSize: 11),
          items: const [
            BottomNavigationBarItem(
              icon: Icon(Icons.home_outlined),
              activeIcon: Icon(Icons.home),
              label: 'HOME',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.search),
              activeIcon: Icon(Icons.search, color: AppTheme.primaryPurple),
              label: 'SEARCH',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.library_music_outlined),
              activeIcon: Icon(Icons.library_music),
              label: 'LIBRARY',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.person_outline),
              activeIcon: Icon(Icons.person),
              label: 'PROFILE',
            ),
          ],
        ),
      ),
    );
  }
}

// Separate view representing the Home Feed scrollable content
class _HomeFeedView extends StatefulWidget {
  final Function(String title, String artist, String color) onTrackSelected;

  const _HomeFeedView({
    Key? key,
    required this.onTrackSelected,
  }) : super(key: key);

  @override
  State<_HomeFeedView> createState() => _HomeFeedViewState();
}

class _HomeFeedViewState extends State<_HomeFeedView> {
  final _mixController = TextEditingController();

  @override
  void dispose() {
    _mixController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'NEOTUNES.',
          style: TextStyle(fontWeight: FontWeight.w900, letterSpacing: -0.5),
        ),
        backgroundColor: Colors.transparent,
        elevation: 0,
        automaticallyImplyLeading: false,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.only(left: 24, right: 24, top: 12, bottom: 120),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // NeoMix prompt generator
            GlassmorphicCard(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: const [
                        Icon(Icons.auto_awesome, color: AppTheme.primaryPurple, size: 20),
                        SizedBox(width: 8),
                        Text(
                          'NEOMIX CO-PILOT AI',
                          style: TextStyle(fontWeight: FontWeight.w900, letterSpacing: 1, fontSize: 12),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: _mixController,
                      decoration: InputDecoration(
                        hintText: "I'm feeling like late night coding in Mumbai...",
                        hintStyle: const TextStyle(color: Colors.grey),
                        border: const OutlineInputBorder(),
                        suffixIcon: IconButton(
                          icon: const Icon(Icons.send, color: AppTheme.primaryPurple),
                          onPressed: () {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('AI playlist compiling...')),
                            );
                            widget.onTrackSelected('AI NeoMix Playlist', 'NeoTunes AI', '#7C3AED');
                          },
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 32),

            // Continuous Listening
            const Text(
              'CONTINUE LISTENING',
              style: TextStyle(fontWeight: FontWeight.w900, letterSpacing: 1.5, fontSize: 12, color: AppTheme.textMuted),
            ),
            const SizedBox(height: 12),
            SizedBox(
              height: 180,
              child: ListView(
                scrollDirection: Axis.horizontal,
                children: [
                  _buildTrackCard('Midnight City', 'M83', '#7C3AED'),
                  _buildTrackCard('Kesariya', 'Arijit Singh', '#FF9933'),
                  _buildTrackCard('Starboy', 'The Weeknd', '#3B82F6'),
                ],
              ),
            ),
            const SizedBox(height: 32),

            // State-level Charts
            const Text(
              'STATE LEVEL CHARTS',
              style: TextStyle(fontWeight: FontWeight.w900, letterSpacing: 1.5, fontSize: 12, color: AppTheme.textMuted),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(child: _buildChartButton('Punjab', '#FF5722')),
                const SizedBox(width: 8),
                Expanded(child: _buildChartButton('Maharashtra', '#9C27B0')),
                const SizedBox(width: 8),
                Expanded(child: _buildChartButton('Tamil Nadu', '#009688')),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildChartButton(String state, String hexColor) {
    final stateColor = Color(int.parse(hexColor.replaceAll('#', '0xFF')));
    return GestureDetector(
      onTap: () {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Loading top tracks for $state...')),
        );
        widget.onTrackSelected('Top Tracks: $state', 'State Chart Hitlist', hexColor);
      },
      child: GlassmorphicCard(
        borderRadius: 12,
        borderColor: stateColor.withOpacity(0.3),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 16),
          child: Column(
            children: [
              Icon(Icons.trending_up, color: stateColor),
              const SizedBox(height: 8),
              Text(
                state,
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 11),
                textAlign: 'center',
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTrackCard(String title, String artist, String hexColor) {
    return GestureDetector(
      onTap: () {
        widget.onTrackSelected(title, artist, hexColor);
      },
      child: Container(
        width: 140,
        margin: const EdgeInsets.only(right: 16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              height: 120,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(16),
                color: AppTheme.surfaceGrey,
              ),
              child: const Center(
                child: Icon(Icons.music_note, color: Colors.grey, size: 40),
              ),
            ),
            const SizedBox(height: 8),
            Text(
              title,
              style: const TextStyle(fontWeight: FontWeight.w800),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            Text(
              artist,
              style: const TextStyle(color: AppTheme.textMuted, fontSize: 11),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }
}
