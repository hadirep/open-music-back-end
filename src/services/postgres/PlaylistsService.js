const { Pool } = require('pg');
const { nanoid } = require('nanoid');
const InvariantError = require('../../exceptions/InvariantError');
const NotFoundError = require('../../exceptions/NotFoundError');
const AuthorizationError = require('../../exceptions/AuthorizationError');

class PlaylistsService {
  constructor(songsService) {
    this._pool = new Pool();
    this._songsService = songsService;
  }

  async addPlaylist({ name, owner }) {
    const id = `playlist-${nanoid(16)}`;

    const query = {
      text: 'INSERT INTO playlists VALUES($1, $2, $3) RETURNING id',
      values: [id, name, owner],
    };

    const result = await this._pool.query(query);

    if (!result.rows[0].id) {
      throw new InvariantError('Playlist gagal ditambahkan');
    }

    return result.rows[0].id;
  }

  async getPlaylists(owner) {
    const query = {
      text:
      `SELECT p.id, p.name, u.username
      FROM playlists AS p
      JOIN users AS u
      ON p.owner = u.id
      WHERE u.id = $1`,
      values: [owner],
    };
    const result = await this._pool.query(query);

    return result.rows;
  }

  async deletePlaylistById(id) {
    const query = {
      text: 'DELETE FROM playlists WHERE id = $1',
      values: [id],
    };

    await this._pool.query(query);
  }

  async addPlaylistSong(playlistId, { songId }) {
    await this._songsService.verifyAddSong(songId);

    const id = nanoid(16);

    const query = {
      text: 'INSERT INTO playlist_songs VALUES($1, $2, $3) RETURNING id',
      values: [id, playlistId, songId],
    };

    const result = await this._pool.query(query);

    if (!result.rows[0].id) {
      throw new InvariantError('Lagu gagal ditambahkan ke playlist');
    }
  }

  async getPlaylistSongsByPlaylistId(id) {
    const playlistQuery = {
      text:
      `SELECT p.id, p.name, u.username
      FROM playlists AS p
      JOIN users AS u
      ON p.owner = u.id
      WHERE p.id = $1`,
      values: [id],
    };
    const songQuery = {
      text: `
      SELECT s.id, s.title, s.performer
      FROM songs AS s
      JOIN playlist_songs AS ps
      ON ps.song_id = s.id
      WHERE ps.playlist_id = $1`,
      values: [id],
    };

    const playlist = await this._pool.query(playlistQuery);
    const songResult = await this._pool.query(songQuery);

    return {
      ...playlist.rows[0],
      songs: songResult.rows,
    };
  }

  async deletePlaylistSongBySongId({ songId }) {
    await this._songsService.verifyDeleteSong(songId);

    const query = {
      text: 'DELETE FROM playlist_songs WHERE song_id = $1',
      values: [songId],
    };

    await this._pool.query(query);
  }

  async verifyPlaylistOwner(id, owner) {
    const query = {
      text: 'SELECT * FROM playlists WHERE id = $1',
      values: [id],
    };

    const result = await this._pool.query(query);

    if (!result.rows.length) {
      throw new NotFoundError('Playlist tidak ditemukan');
    }

    const note = result.rows[0];

    if (note.owner !== owner) {
      throw new AuthorizationError('Anda tidak berhak mengakses resource ini');
    }
  }
}

module.exports = PlaylistsService;
