import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/glassmorphic_card.dart';
import '../player/player_screen.dart';

class SearchScreen extends ConsumerStatefulWidget {
  const SearchScreen({Key? key}) : super(key: key);

  @override
  ConsumerState<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends ConsumerState<SearchScreen> {
  final _searchController = TextEditingController();
  String _query = '';
  
  final List<Map<String, String>> _categories = [
    {'title': 'Chill Vibes', 'color': '#7C3AED', 'genre': 'Lo-Fi'},
    {'title': 'Bollywood Hits', 'color': '#FF9933', 'genre': 'Bollywood'},
    {'title': 'Anime Beats', 'color': '#06B6D4', 'genre': 'J-Pop'},
    {'title': 'Punjabi Pop', 'color': '#EC4899', 'genre': 'Punjabi'},
    {'title': 'Gym Pump', 'color': '#EF4444', 'genre': 'Electronic'},
    {'title': 'Late Night Code', 'color': '#3B82F6', 'genre': 'Ambient'},
  ];

  final List<Map<String, String>> _mockTracks = [
    {'title': 'Midnight City', 'artist': 'M83', 'color': '#7C3AED', 'genre': 'Ambient'},
    {'title': 'Kesariya', 'artist': 'Arijit Singh', 'color': '#FF9933', 'genre': 'Bollywood'},
    {'title': 'Starboy', 'artist': 'The Weeknd', 'color': '#3B82F6', 'genre': 'Pop'},
    {'title': 'Pasoori', 'artist': 'Ali Sethi', 'color': '#EC4899', 'genre': 'Punjabi'},
    {'title': 'Gurenge', 'artist': 'LiSA', 'color': '#06B6D4', 'genre': 'J-Pop'},
    {'title': 'Lofi Rain', 'artist': 'Chillhop Cafe', 'color': '#10B981', 'genre': 'Lo-Fi'},
  ];

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  List<Map<String, String>> get _filteredTracks {
    if (_query.isEmpty) return [];
    return _mockTracks.where((track) {
      final titleMatch = track['title']!.toLowerCase().contains(_query.toLowerCase());
      final artistMatch = track['artist']!.toLowerCase().contains(_query.toLowerCase());
      final genreMatch = track['genre']!.toLowerCase().contains(_query.toLowerCase());
      return titleMatch || artistMatch || genreMatch;
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('SEARCH', style: TextStyle(fontWeight: FontWeight.w900, letterSpacing: 1)),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Search Input Box
              GlassmorphicCard(
                borderRadius: 16,
                child: TextField(
                  controller: _searchController,
                  onChanged: (val) {
                    setState(() {
                      _query = val;
                    });
                  },
                  decoration: InputDecoration(
                    hintText: 'Search songs, artists, genres...',
                    hintStyle: const TextStyle(color: AppTheme.textMuted),
                    prefixIcon: const Icon(Icons.search, color: AppTheme.accentCyan),
                    suffixIcon: _query.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear, color: AppTheme.textMuted),
                            onPressed: () {
                              _searchController.clear();
                              setState(() {
                                _query = '';
                              });
                            },
                          )
                        : null,
                    border: InputBorder.none,
                    contentPadding: const EdgeInsets.symmetric(vertical: 15),
                  ),
                ),
              ),
              const SizedBox(height: 24),

              // Dynamic content based on search query
              Expanded(
                child: _query.isEmpty
                    ? _buildBrowseCategories()
                    : _buildSearchResults(),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildBrowseCategories() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'BROWSE ALL',
          style: TextStyle(
            fontWeight: FontWeight.w900,
            letterSpacing: 1.5,
            fontSize: 12,
            color: AppTheme.textMuted,
          ),
        ),
        const SizedBox(height: 16),
        Expanded(
          child: GridView.builder(
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              crossAxisSpacing: 16,
              mainAxisSpacing: 16,
              childAspectRatio: 1.5,
            ),
            itemCount: _categories.length,
            itemBuilder: (context, index) {
              final cat = _categories[index];
              final categoryColor = Color(int.parse(cat['color']!.replaceAll('#', '0xFF')));
              return GestureDetector(
                onTap: () {
                  setState(() {
                    _searchController.text = cat['genre']!;
                    _query = cat['genre']!;
                  });
                },
                child: GlassmorphicCard(
                  borderRadius: 16,
                  borderColor: categoryColor.withOpacity(0.3),
                  child: Container(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [
                          categoryColor.withOpacity(0.1),
                          categoryColor.withOpacity(0.3),
                        ],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                    ),
                    padding: const EdgeInsets.all(16),
                    child: Align(
                      alignment: Alignment.bottomLeft,
                      child: Text(
                        cat['title']!,
                        style: const TextStyle(
                          fontWeight: FontWeight.w900,
                          fontSize: 16,
                          letterSpacing: -0.5,
                        ),
                      ),
                    ),
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _buildSearchResults() {
    final results = _filteredTracks;
    if (results.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: const [
            Icon(Icons.search_off, size: 64, color: AppTheme.textMuted),
            SizedBox(height: 16),
            Text(
              'No results found',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppTheme.textMuted),
            ),
            SizedBox(height: 8),
            Text(
              'Try searching for another song, artist, or genre.',
              style: TextStyle(fontSize: 12, color: AppTheme.textMuted),
              textAlign: 'center',
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      itemCount: results.length,
      itemBuilder: (context, index) {
        final track = results[index];
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
                child: Center(
                  child: Icon(Icons.music_note, color: trackColor.withOpacity(0.8)),
                ),
              ),
              title: Text(track['title']!, style: const TextStyle(fontWeight: FontWeight.bold)),
              subtitle: Text(track['artist']!, style: const TextStyle(color: AppTheme.textMuted, fontSize: 12)),
              trailing: const Icon(Icons.play_arrow, color: AppTheme.accentCyan),
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
      },
    );
  }
}
