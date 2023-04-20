const mapDBToModelAlbum = ({
    id,
    name,
    year,
    performer,
    genre,
    duration,
    album_id,
    created_at,
    updated_at,
  }) => ({
    id,
    name,
    year,
    performer,
    genre,
    duration,
    albumId: album_id,
    createdAt: created_at,
    updatedAt: updated_at,
  });
  
  module.exports = { mapDBToModelAlbum };