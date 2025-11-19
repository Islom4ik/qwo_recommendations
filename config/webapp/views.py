import json

from django.shortcuts import render, HttpResponse

from webapp.recommendations import get_songs_recommendations

# Create your views here.
files_verson = '1.5'
def VIEW_main(request):
    print(request.GET)
    if 'songs_ids' not in request.GET:
        return HttpResponse('No recommendations yet! Please download at least one track.')

    songs_ids = request.GET['songs_ids'].replace(' ', '').split(',')
    if not songs_ids:
        return HttpResponse('No recommendations yet! Please download at least one track.')

    recommendations = get_songs_recommendations(songs_ids=songs_ids)
    # recommendations = None
    return render(request=request, template_name='webapp/index.html', context=dict(files_verson=files_verson, first_track=None if not recommendations else recommendations[0], tracks_json=json.dumps(recommendations or [])))